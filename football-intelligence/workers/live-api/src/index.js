const PUBLIC_ORIGIN = "https://arawee-mayeku-sportz-hillary.pages.dev";
const LIVE_CACHE_SECONDS = 30;
const ODDS_CACHE_SECONDS = 300;
const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 30;
const ASSISTANT_MAX_REQUESTS_PER_WINDOW = 8;
const ASSISTANT_WINDOW_SECONDS = 60;
const GEMINI_MODEL = "gemini-3.1-flash-lite";
const SPORTMONKS_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
const requestWindows = new Map();
const assistantWindows = new Map();
let sportmonksUnavailableUntil = 0;

const scheduledFixtures = {
  "demo-hul-mun": { home_team: "Hull City", away_team: "Manchester United", kickoff_at: "2026-08-22T11:30:00Z" },
  "demo-ips-sun": { home_team: "Ipswich Town", away_team: "Sunderland", kickoff_at: "2026-08-22T14:00:00Z" },
  "demo-eve-cry": { home_team: "Everton", away_team: "Crystal Palace", kickoff_at: "2026-08-22T14:00:00Z" },
  "demo-nfo-lee": { home_team: "Nottingham Forest", away_team: "Leeds United", kickoff_at: "2026-08-22T14:00:00Z" },
  "demo-bre-tot": { home_team: "Brentford", away_team: "Tottenham Hotspur", kickoff_at: "2026-08-22T16:30:00Z" },
  "demo-mci-bou": { home_team: "Manchester City", away_team: "AFC Bournemouth", kickoff_at: "2026-08-23T13:00:00Z" },
  "demo-bha-ava": { home_team: "Brighton & Hove Albion", away_team: "Aston Villa", kickoff_at: "2026-08-23T13:00:00Z" },
  "demo-new-liv": { home_team: "Newcastle United", away_team: "Liverpool", kickoff_at: "2026-08-23T15:30:00Z" },
  "demo-ful-che": { home_team: "Fulham", away_team: "Chelsea", kickoff_at: "2026-08-24T19:00:00Z" },
};

function canonicalScheduledFixture(fixtureId, fixture) {
  return {
    id: fixtureId,
    competition: "England · schedule preview",
    home_team: fixture.home_team,
    away_team: fixture.away_team,
    kickoff_at: fixture.kickoff_at,
    status: "SCHEDULED",
    mode: "DEMO",
    fixture_identity: {
      arawee_fixture_id: fixtureId,
      sportmonks_fixture_id: null,
      odds_provider_event_id: null,
      video_provider_fixture_id: null,
      competition_id: null,
      home_team_id: null,
      away_team_id: null,
      kickoff_at: fixture.kickoff_at,
    },
    prediction_status: "DEMO_SCHEDULE_PREVIEW",
    notice: "This is an explicit schedule-preview fallback. A real fixture must receive provider IDs and a model record before it is treated as live or modelled.",
  };
}

function weeklyFixtures() {
  return Object.entries(scheduledFixtures).map(([fixtureId, fixture]) => canonicalScheduledFixture(fixtureId, fixture));
}

function isAllowedOrigin(origin) {
  return origin === PUBLIC_ORIGIN || origin === "http://localhost:3000";
}

function secureJson(payload, status = 200, origin = null) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "geolocation=(), microphone=(), camera=()",
    "x-frame-options": "DENY",
  });
  if (origin && isAllowedOrigin(origin)) headers.set("access-control-allow-origin", origin);
  if (origin && isAllowedOrigin(origin)) headers.set("vary", "Origin");
  return new Response(JSON.stringify(payload), { status, headers });
}

function isRateLimited(request) {
  const now = Date.now();
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const existing = (requestWindows.get(address) || []).filter((timestamp) => timestamp > now - WINDOW_SECONDS * 1000);
  if (existing.length >= MAX_REQUESTS_PER_WINDOW) return true;
  existing.push(now);
  requestWindows.set(address, existing);
  return false;
}

function isAssistantRateLimited(request) {
  const now = Date.now();
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const existing = (assistantWindows.get(address) || []).filter((timestamp) => timestamp > now - ASSISTANT_WINDOW_SECONDS * 1000);
  if (existing.length >= ASSISTANT_MAX_REQUESTS_PER_WINDOW) return true;
  existing.push(now);
  assistantWindows.set(address, existing);
  return false;
}

function normaliseSportmonks(payload, checkedAt) {
  const records = Array.isArray(payload?.data) ? payload.data : payload?.data && typeof payload.data === "object" ? [payload.data] : [];
  const updates = records
    .filter((item) => item && Number.isInteger(item.id))
    .map((item) => ({
      fixture_id: item.id,
      name: typeof item.name === "string" ? item.name : "Unnamed fixture",
      state_id: Number.isInteger(item.state_id) ? item.state_id : null,
      starting_at: typeof item.starting_at === "string" ? item.starting_at : null,
      last_processed_at: typeof item.last_processed_at === "string" ? item.last_processed_at : null,
      score_count: Array.isArray(item.scores) ? item.scores.length : 0,
      event_count: Array.isArray(item.events) ? item.events.length : 0,
      status: null,
      home_score: null,
      away_score: null,
    }));
  return {
    mode: "LIVE",
    provider: "sportmonks",
    data_status: "CURRENT",
    checked_at: checkedAt,
    cache_seconds: LIVE_CACHE_SECONDS,
    updates,
    notice: "Sportmonks latest-update feed. Empty updates means no fixture changed in the provider window; it does not mean no football is being played.",
  };
}

function normaliseTheSportsDb(payload, checkedAt) {
  const records = Array.isArray(payload?.livescore) ? payload.livescore : [];
  return {
    mode: "LIVE",
    provider: "thesportsdb",
    data_status: "CURRENT",
    checked_at: checkedAt,
    cache_seconds: LIVE_CACHE_SECONDS,
    updates: records
      .filter((item) => item && typeof item.idEvent === "string")
      .map((item) => ({
        fixture_id: item.idEvent,
        name: item.strEvent || `${item.strHomeTeam || "Home"} vs ${item.strAwayTeam || "Away"}`,
        state_id: null,
        starting_at: item.dateEvent ? `${item.dateEvent}T${item.strTime || "00:00:00"}Z` : null,
        last_processed_at: null,
        score_count: item.intHomeScore !== null || item.intAwayScore !== null ? 2 : 0,
        event_count: 0,
        home_team: item.strHomeTeam || null,
        away_team: item.strAwayTeam || null,
        home_score: item.intHomeScore ?? null,
        away_score: item.intAwayScore ?? null,
        status: item.strStatus || null,
      })),
    notice: "Live scores from TheSportsDB while the primary provider reconnects. This source does not provide a verified event-by-event timeline.",
  };
}

async function fetchTheSportsDb(checkedAt) {
  const response = await fetch("https://www.thesportsdb.com/api/v1/json/123/livescore.php?s=Soccer");
  if (!response.ok) throw new Error("Fallback live-score provider is unavailable.");
  return normaliseTheSportsDb(await response.json(), checkedAt);
}

function normaliseOdds(payload, checkedAt) {
  const events = Array.isArray(payload) ? payload : [];
  return {
    mode: "LIVE",
    provider: "the-odds-api",
    data_status: "CURRENT",
    checked_at: checkedAt,
    cache_seconds: ODDS_CACHE_SECONDS,
    events: events
      .filter((event) => event && typeof event.id === "string" && typeof event.home_team === "string" && typeof event.away_team === "string")
      .map((event) => {
        const bookmaker = Array.isArray(event.bookmakers) ? event.bookmakers.find((candidate) => Array.isArray(candidate?.markets)) : null;
        const market = bookmaker?.markets?.find((candidate) => candidate?.key === "h2h");
        return {
          event_id: event.id,
          home_team: event.home_team,
          away_team: event.away_team,
          commence_time: typeof event.commence_time === "string" ? event.commence_time : null,
          bookmaker: bookmaker && market ? {
            name: typeof bookmaker.title === "string" ? bookmaker.title : "Bookmaker",
            updated_at: typeof bookmaker.last_update === "string" ? bookmaker.last_update : null,
            outcomes: (Array.isArray(market.outcomes) ? market.outcomes : [])
              .filter((outcome) => outcome && typeof outcome.name === "string" && Number.isFinite(Number(outcome.price)))
              .map((outcome) => ({ name: outcome.name, price: Number(outcome.price) })),
          } : null,
        };
      }),
    notice: "Decimal 1X2 odds from a single bookmaker returned by the provider. Verify every price at your own bookmaker before acting; this app does not place wagers or recommend a stake.",
  };
}

async function upcomingOdds(request, env, ctx, origin) {
  if (!env.THE_ODDS_API_KEY) return secureJson({ detail: "Live odds are not configured." }, 503, origin);
  const cache = caches.default;
  const cacheKey = new Request(new URL("/__internal/upcoming-odds-v1", request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return secureJson(await cached.json(), 200, origin);

  try {
    const providerUrl = new URL("https://api.the-odds-api.com/v4/sports/soccer_epl/odds/");
    providerUrl.searchParams.set("apiKey", env.THE_ODDS_API_KEY);
    providerUrl.searchParams.set("regions", "eu");
    providerUrl.searchParams.set("markets", "h2h");
    providerUrl.searchParams.set("oddsFormat", "decimal");
    const providerResponse = await fetch(providerUrl.toString());
    if (!providerResponse.ok) throw new Error("Odds provider rejected the request.");
    const payload = normaliseOdds(await providerResponse.json(), new Date().toISOString());
    const cacheResponse = new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": `max-age=${ODDS_CACHE_SECONDS}` },
    });
    ctx.waitUntil(cache.put(cacheKey, cacheResponse));
    return secureJson(payload, 200, origin);
  } catch {
    return secureJson({ detail: "Live odds are temporarily unavailable." }, 503, origin);
  }
}

async function liveScores(request, env, ctx, origin) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/__internal/live-scores-v1", request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return secureJson(await cached.json(), 200, origin);

  const checkedAt = new Date().toISOString();
  let payload;
  if (env.SPORTMONKS_TOKEN && Date.now() >= sportmonksUnavailableUntil) {
    try {
      const providerUrl = new URL("https://api.sportmonks.com/v3/football/livescores/latest");
      providerUrl.searchParams.set("include", "scores;participants;state");
      const providerResponse = await fetch(providerUrl.toString(), {
        headers: { Authorization: `Bearer ${env.SPORTMONKS_TOKEN}` },
      });
      if (!providerResponse.ok) throw new Error("Sportmonks rejected the request.");
      payload = normaliseSportmonks(await providerResponse.json(), checkedAt);
    } catch {
      sportmonksUnavailableUntil = Date.now() + SPORTMONKS_RETRY_COOLDOWN_MS;
    }
  }
  if (!payload) {
    try {
      payload = await fetchTheSportsDb(checkedAt);
    } catch {
      return secureJson({ detail: "Live scores are temporarily unavailable." }, 503, origin);
    }
  }
  const cacheResponse = new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `max-age=${LIVE_CACHE_SECONDS}` },
  });
  ctx.waitUntil(cache.put(cacheKey, cacheResponse));
  return secureJson(payload, 200, origin);
}

function sseResponse(payload, origin) {
  const headers = new Headers({
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  if (origin && isAllowedOrigin(origin)) headers.set("access-control-allow-origin", origin);
  if (origin && isAllowedOrigin(origin)) headers.set("vary", "Origin");
  return new Response(`event: status\ndata: {"state":"retrieving_evidence"}\n\nevent: final\ndata: ${JSON.stringify(payload)}\n\n`, { status: 200, headers });
}

function assistantFixture(fixtureId) {
  const fixture = scheduledFixtures[fixtureId];
  if (!fixture) return null;
  return {
    ...canonicalScheduledFixture(fixtureId, fixture),
    fixture_id: fixtureId,
    ...fixture,
    data_status: "DEMO",
    prediction: {
      market: "1X2",
      selection: fixture.home_team,
      model_probability: 0.5,
      final_calibrated_probability: 0.5,
      conservative_probability: 0.4,
      fair_odds: 2,
      reliability: 60,
      decision: "WATCH",
      reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"],
    },
    data_health: { completeness: 72, freshness: 100, source: "SCHEDULED · curated public release" },
  };
}

function readExplicitNumbers(question, priorContext) {
  const oddsMatch = /\b(?:at|odds?\s*(?:of|is|=)?|@)\s*([1-9]\d*(?:\.\d+)?)\b/i.exec(question);
  const stakeMatch = /\b(?:ugx|ush|shs)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(k)?\b/i.exec(question) || /\b([0-9][0-9,]*(?:\.\d+)?)\s*(k|ugx|ush|shs)\b/i.exec(question);
  const odds = oddsMatch ? Number(oddsMatch[1]) : Number(priorContext?.last_decimal_odds) || null;
  const rawStake = stakeMatch ? Number(stakeMatch[1].replaceAll(",", "")) : null;
  const stake = rawStake ? rawStake * (stakeMatch[2]?.toLowerCase() === "k" ? 1000 : 1) : Number(priorContext?.last_stake_ugx) || null;
  return { odds: Number.isFinite(odds) && odds > 1 ? odds : null, stake: Number.isFinite(stake) && stake > 0 ? stake : null };
}

function baseAssistantReply(fixture, context) {
  return {
    mode: "DEMO",
    data_status: "DEMO_ONLY",
    decision: "WATCH",
    reasons: fixture.prediction.reasons,
    facts: [
      `Fixture context: ${fixture.home_team} vs ${fixture.away_team} (${fixture.status}).`,
      "Current odds, lineups, injuries, live score and xG are unavailable in this free schedule preview.",
      "The displayed 50.0% model state is schedule-preview data, not a live recommendation.",
    ],
    suggestions: ["Analyse this match", "What odds should I accept?", "Home team at 2.20, UGX 10,000", "Why did probability change?"],
    evidence: [
      { label: "Fixture schedule", source: fixture.data_health.source, status: "DEMO" },
      { label: "Live data", source: "Authorised provider", status: "UNAVAILABLE" },
    ],
    tools_used: ["get_match_details", "get_match_prediction", "get_data_health"],
    context: { fixture_id: fixture.fixture_id, last_decimal_odds: context?.last_decimal_odds || null, last_stake_ugx: context?.last_stake_ugx || null },
  };
}

function deterministicCalculationReply(fixture, numbers) {
  const grossReturn = numbers.stake * numbers.odds;
  const grossProfit = grossReturn - numbers.stake;
  const tax = grossProfit * 0.15;
  const netReturn = grossReturn - tax;
  const minimumAcceptableOdds = 1 + ((((1 + 0.03) / 0.4) - 1) / (1 - 0.15));
  return {
    ...baseAssistantReply(fixture, { last_decimal_odds: numbers.odds, last_stake_ugx: numbers.stake }),
    provider: "DETERMINISTIC",
    answer: `At ${numbers.odds.toFixed(2)}, a hypothetical UGX ${numbers.stake.toLocaleString("en-US", { maximumFractionDigits: 0 })} ticket has a potential net return of UGX ${netReturn.toLocaleString("en-US", { maximumFractionDigits: 0 })} after the configured 15% demo tax. The schedule preview remains WATCH because live data, lineups and current odds are not verified.`,
    calculation: {
      decimal_odds: numbers.odds,
      stake_ugx: numbers.stake,
      gross_return_ugx: grossReturn,
      gross_profit_ugx: grossProfit,
      estimated_tax_ugx: tax,
      potential_net_return_ugx: netReturn,
      potential_net_profit_ugx: netReturn - numbers.stake,
      conservative_net_expected_value_percent: Number(((0.4 * (1 + ((numbers.odds - 1) * 0.85)) - 1) * 100).toFixed(1)),
      minimum_acceptable_odds: Number(minimumAcceptableOdds.toFixed(3)),
    },
    tools_used: ["evaluate_entered_odds", "calculate_payout", "calculate_tax"],
  };
}

function unavailableAssistantReply(fixture, context, reason) {
  return {
    ...baseAssistantReply(fixture, context),
    provider: "DETERMINISTIC",
    answer: reason,
    disclaimer: "Free edge mode. It never presents missing live data as fact and never places a bet.",
  };
}

async function edgeAssistant(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return secureJson({ detail: "A JSON assistant request is required." }, 400, origin);
  }
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 800) : "";
  const fixture = assistantFixture(typeof body?.fixture_id === "string" ? body.fixture_id : "");
  const context = body?.context && typeof body.context === "object" ? body.context : {};
  if (!question) return secureJson({ detail: "Question is required." }, 400, origin);
  if (!fixture) return sseResponse({
    mode: "DEMO", data_status: "LIVE_UNAVAILABLE", provider: "DETERMINISTIC", answer: "This fixture has no server-side schedule record, so the free analyst will not invent an analysis.", facts: ["Fixture record: unavailable."], reasons: [], suggestions: [], evidence: [{ label: "Fixture record", source: "Arawee/Mayeku-Sportz", status: "UNAVAILABLE" }], tools_used: ["get_match_details"], disclaimer: "Free edge mode. No fixture data was substituted or invented.", context: { fixture_id: body?.fixture_id || null },
  }, origin);
  const numbers = readExplicitNumbers(question, context);
  if (numbers.odds && numbers.stake) {
    return sseResponse(deterministicCalculationReply(fixture, numbers), origin);
  }
  const liveQuestion = /\b(live|happening|score|xg|lineup|injury|injuries|news today)\b/i.test(question);
  if (liveQuestion) {
    return sseResponse(unavailableAssistantReply(fixture, context, "Current live score, xG, lineup, injury and news data are unavailable in this free schedule preview, so I will not invent an update."), origin);
  }
  if (!env.GEMINI_API_KEY) {
    return sseResponse(unavailableAssistantReply(fixture, context, "The free Gemini explanation service is not configured. Deterministic payout calculations still work."), origin);
  }
  if (isAssistantRateLimited(request)) {
    return sseResponse(unavailableAssistantReply(fixture, context, "The free analyst request limit has been reached for this minute. Try again shortly; this limit prevents unexpected charges."), origin);
  }
  const prompt = `You are a concise football-analysis explanation layer. Use only this verified application context. Do not invent or infer any missing facts, scores, odds, injuries, lineups, xG, live events or betting results. State unavailable facts clearly. Never tell a user to place a bet or promise an outcome.\n\nVerified context: ${JSON.stringify({ fixture, question })}\n\nAnswer the user's question in at most 130 words, referencing only the values above.`;
  try {
    const providerResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 300 } }),
    });
    if (!providerResponse.ok) throw new Error("Gemini unavailable");
    const providerPayload = await providerResponse.json();
    const answer = providerPayload?.candidates?.[0]?.content?.parts?.map((part) => typeof part?.text === "string" ? part.text : "").join("\n").trim();
    if (!answer) throw new Error("Gemini produced no text");
    return sseResponse({
      ...baseAssistantReply(fixture, context),
      provider: "GEMINI",
      answer,
      disclaimer: "Free edge Gemini mode. It explains only the listed schedule-preview evidence; it does not access a bookmaker or present missing live data as fact.",
    }, origin);
  } catch {
    return sseResponse(unavailableAssistantReply(fixture, context, "The free Gemini quota is temporarily unavailable. I can still calculate a hypothetical payout from explicit odds and stake."), origin);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (origin && !isAllowedOrigin(origin)) return secureJson({ detail: "Origin is not allowed." }, 403, origin);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin && isAllowedOrigin(origin) ? origin : PUBLIC_ORIGIN,
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "Content-Type",
          "access-control-max-age": "86400",
          vary: "Origin",
        },
      });
    }
    if (request.method === "POST" && url.pathname === "/api/v1/assistant/query/stream") return edgeAssistant(request, env, origin);
    if (request.method !== "GET") return secureJson({ detail: "Method not allowed." }, 405, origin);
    if (isRateLimited(request)) return secureJson({ detail: "Rate limit exceeded." }, 429, origin);
    if (url.pathname === "/health") return secureJson({ status: "ok", service: "arawee-live-api" }, 200, origin);
    if (url.pathname === "/api/v1/fixtures") return secureJson({ mode: "DEMO", source: "canonical schedule-preview fallback", fixtures: weeklyFixtures() }, 200, origin);
    if (url.pathname === "/api/v1/live/livescores") return liveScores(request, env, ctx, origin);
    if (url.pathname === "/api/v1/markets/upcoming") return upcomingOdds(request, env, ctx, origin);
    return secureJson({ detail: "Not found." }, 404, origin);
  },
};
