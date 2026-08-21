const PUBLIC_ORIGIN = "https://arawee-mayeku-sportz-hillary.pages.dev";
const LIVE_CACHE_SECONDS = 30;
const ODDS_CACHE_SECONDS = 300;
const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 30;
const SPORTMONKS_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
const requestWindows = new Map();
let sportmonksUnavailableUntil = 0;

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
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "Content-Type",
          "access-control-max-age": "86400",
          vary: "Origin",
        },
      });
    }
    if (request.method !== "GET") return secureJson({ detail: "Method not allowed." }, 405, origin);
    if (isRateLimited(request)) return secureJson({ detail: "Rate limit exceeded." }, 429, origin);
    if (url.pathname === "/health") return secureJson({ status: "ok", service: "arawee-live-api" }, 200, origin);
    if (url.pathname === "/api/v1/live/livescores") return liveScores(request, env, ctx, origin);
    if (url.pathname === "/api/v1/markets/upcoming") return upcomingOdds(request, env, ctx, origin);
    return secureJson({ detail: "Not found." }, 404, origin);
  },
};
