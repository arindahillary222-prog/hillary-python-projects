"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnalystAssistant } from "./analyst-assistant";
import { InstallApp } from "./install-app";
import { LiveFeed } from "./live-feed";
import { LiveSparkline } from "./terminal-visuals";
import { type Decision, type Fixture, upcomingFixtures } from "./upcoming-fixtures";
type Offer = {
  decision: Decision; reasons: string[]; expected_value_percent: number | null; net_expected_value_percent?: number | null;
  conservative_net_expected_value_percent?: number | null; effective_odds?: number | null; minimum_acceptable_odds?: number | null;
  price_current: boolean; price_expires_at?: string | null; tax_rate_percent?: number | null; fair_odds: number; suggested_max_stake_ugx: number; disclaimer: string;
};

const ugx = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

function StatePill({ state }: { state: Decision }) { return <span className={`state-pill ${state.toLowerCase()}`}>{state.replace("_", " ")}</span>; }
function direction(value: number) { return value > 0.002 ? "up" : value < -0.002 ? "down" : "neutral" as const; }
function fmt(value: number | undefined) { return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`; }
function percent(value: number | null | undefined) { return value === null || value === undefined ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`; }

export function Dashboard() {
  const [fixture, setFixture] = useState<Fixture>(upcomingFixtures[0]);
  const [watchingIds, setWatchingIds] = useState<string[]>([]);
  const [price, setPrice] = useState("2.20");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("ams-watchlist-v1");
      if (stored) setWatchingIds((JSON.parse(stored) as unknown[]).filter((item): item is string => typeof item === "string"));
    } catch {
      setWatchingIds([]);
    }
  }, []);

  const kickoff = useMemo(() => scheduleTime(fixture.kickoff_at, true), [fixture.kickoff_at]);
  const probability = fixture.prediction.final_calibrated_probability ?? fixture.prediction.probability;
  const marketProbability = fixture.prediction.market_probability;
  const residual = fixture.prediction.market_residual ?? (marketProbability === undefined ? 0 : probability - marketProbability);

  function toggleWatch(fixtureId: string) {
    setWatchingIds((current) => {
      const next = current.includes(fixtureId) ? current.filter((item) => item !== fixtureId) : [...current, fixtureId];
      try { window.localStorage.setItem("ams-watchlist-v1", JSON.stringify(next)); } catch { /* The button remains usable when storage is unavailable. */ }
      return next;
    });
  }

  function selectFixture(nextFixture: Fixture) {
    setFixture(nextFixture);
    setOffer(null);
    document.getElementById("selected-fixture")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setOffer({ decision: "WATCH", reasons: ["WATCH_PRICE"], expected_value_percent: null, net_expected_value_percent: null, conservative_net_expected_value_percent: null, price_current: false, fair_odds: fixture.prediction.fair_odds, suggested_max_stake_ugx: 0, disclaimer: `The ${fixture.home_team} vs ${fixture.away_team} schedule is available, but there is no authorised price feed yet. No bookmaker is contacted.` });
    setLoading(false);
  }

  return <main className="terminal-shell">
    <header className="terminal-topbar">
      <Link className="terminal-brand" href="/" aria-label="Arawee/Mayeku-Sportz home"><span className="brand-mark">AMS</span><span><strong>Arawee/Mayeku-Sportz</strong><small>Football intelligence terminal</small></span></Link>
      <div className="topbar-status"><InstallApp /><span className="mode-flag">SCHEDULE</span><span className="status-dot amber" /> <span>SHADOW MODE</span></div>
    </header>

    <section className="market-ticker" aria-label="Match ticker">
      <Link href={`/fixtures/${fixture.id}`} className="ticker-instrument"><span className="ticker-score">PRE</span><strong>{fixture.home_team.slice(0, 3).toUpperCase()}–{fixture.away_team.slice(0, 3).toUpperCase()}</strong><span>HOME {fmt(probability)}</span><b className={`movement ${direction(residual)}`}>{residual >= 0 ? "▲" : "▼"} {Math.abs(residual * 100).toFixed(1)} pp</b><LiveSparkline label="No live observations yet" points={[{ value: probability, label: "Current" }]} direction={direction(residual)} /></Link>
      <div className="ticker-status"><span>MODEL HEALTH <b>DEMO</b></span><span>DATA <b>{fixture.data_health.freshness.toFixed(0)}</b></span><span>LIVE FEEDS <b>0</b></span></div>
    </section>

    <section className="terminal-intro"><div><p className="eyebrow">PRE-MATCH DECISION DESK</p><h1>Find the price.<br /><em>Keep the proof.</em></h1><p>Market-aware football probabilities, uncertainty and evidence — designed to abstain before pretending to know.</p></div><div className="intro-stamp"><span>UPCOMING FIXTURES</span><strong>{upcomingFixtures.length} matches on the board</strong><small>All listed times are shown in Central European Summer Time.</small></div></section>

    <section className="dashboard-grid" id="selected-fixture">
      <article className="instrument-card"><div className="instrument-top"><div><p>{fixture.competition}</p><span>{kickoff}</span></div><StatePill state={fixture.prediction.decision} /></div><div className="teams"><strong>{fixture.home_team}</strong><span>vs</span><strong>{fixture.away_team}</strong></div><div className="selection-row"><span>RECOMMENDED MARKET</span><b>{fixture.prediction.selection} · {fixture.prediction.market}</b><Link href={`/fixtures/${fixture.id}`}>Open terminal →</Link></div><div className="five-quantities"><Quantity label="Football model" value={fmt(fixture.prediction.football_model_probability)} /><Quantity label="Market" value={fmt(marketProbability)} /><Quantity label="Calibrated" value={fmt(probability)} /><Quantity label="Conservative" value={fmt(fixture.prediction.conservative_probability)} /><Quantity label="Reliability" value={`${fixture.prediction.reliability.toFixed(0)}/100`} /></div><div className="instrument-foot"><span>MODEL–MARKET EDGE</span><b className={`movement ${direction(residual)}`}>{residual >= 0 ? "+" : ""}{(residual * 100).toFixed(1)} pp</b><span>Range {(fixture.prediction.uncertainty_low * 100).toFixed(0)}–{(fixture.prediction.uncertainty_high * 100).toFixed(0)}%</span></div></article>
      <aside className="decision-panel"><p className="eyebrow">SYSTEM VERDICT</p><StatePill state={fixture.prediction.decision} /><h2>{fixture.prediction.decision === "WATCH" ? "Wait for the missing proof." : "Check the evidence."}</h2><p>Reason codes are permanent with each prediction snapshot.</p><div className="reason-list">{fixture.prediction.reasons.map((reason) => <span key={reason}>{reason.replaceAll("_", " ")}</span>)}</div><button className={`watch-trigger ${watchingIds.includes(fixture.id) ? "watching" : ""}`} type="button" onClick={() => toggleWatch(fixture.id)} aria-pressed={watchingIds.includes(fixture.id)}>{watchingIds.includes(fixture.id) ? "WATCHING ✓" : "WATCH THIS MATCH"}</button><Link href={`/fixtures/${fixture.id}`} className="terminal-link">See sources & model detail →</Link></aside>
    </section>

    <section className="fixture-board" aria-labelledby="fixture-board-title"><div className="fixture-board-heading"><div><p className="eyebrow">SCHEDULE · 22–24 AUGUST</p><h2 id="fixture-board-title">Upcoming matches.</h2><p>Choose a fixture for the desk, save it to your private watchlist, or open its terminal.</p></div><span className="watch-count">{watchingIds.length} WATCHING</span></div><div className="fixture-grid">{upcomingFixtures.map((nextFixture) => { const watching = watchingIds.includes(nextFixture.id); const selected = nextFixture.id === fixture.id; return <article className={`fixture-card ${selected ? "selected" : ""}`} key={nextFixture.id}><div><span>{scheduleTime(nextFixture.kickoff_at, true)}</span><span>{nextFixture.venue}</span></div><h3>{nextFixture.home_team} <small>vs</small> {nextFixture.away_team}</h3><div className="fixture-card-actions"><button className="desk-trigger" type="button" onClick={() => selectFixture(nextFixture)}>{selected ? "ON DESK" : "VIEW DESK"}</button><button className={`watch-trigger ${watching ? "watching" : ""}`} type="button" onClick={() => toggleWatch(nextFixture.id)} aria-pressed={watching}>{watching ? "WATCHING ✓" : "WATCH"}</button><Link href={`/fixtures/${nextFixture.id}`}>Open terminal →</Link></div></article>; })}</div></section>

    <section className="health-strip" aria-label="Data and model health"><Health label="DATA COMPLETENESS" value={`${fixture.data_health.completeness.toFixed(0)}%`} tone={fixture.data_health.status.toLowerCase()} /><Health label="DATA FRESHNESS" value={`${fixture.data_health.freshness.toFixed(0)}%`} tone={fixture.data_health.status.toLowerCase()} /><Health label="MODEL AGREEMENT" value={`${fixture.prediction.agreement.toFixed(0)}/100`} tone="green" /><Health label="DE-VIG DISPERSION" value={fixture.prediction.devig_method_dispersion === undefined ? "—" : `${(fixture.prediction.devig_method_dispersion * 100).toFixed(2)} pp`} tone="amber" /></section>

    <LiveFeed />

    <AnalystAssistant fixture={fixture} />

    <section className="manual-check"><div><p className="eyebrow">MANUAL PRICE CHECK · BETPAWA STAYS MANUAL</p><h2>Does the available price survive tax and uncertainty?</h2><p>Enter a price you can see. Arawee/Mayeku-Sportz never signs in, scrapes, clicks or places a bookmaker wager.</p></div><form onSubmit={evaluate}><label htmlFor="price">Current decimal odds</label><div className="price-input"><input id="price" type="number" inputMode="decimal" min="1.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /><button type="submit" disabled={loading}>{loading ? "Checking…" : "Evaluate"}</button></div><small>Calculated with the versioned Uganda 15% net-winnings tax rule in demo mode.</small></form>
      {offer ? <div className="manual-result"><StatePill state={offer.decision} /><Metric label="Gross EV" value={percent(offer.expected_value_percent)} /><Metric label="Net EV" value={percent(offer.net_expected_value_percent)} /><Metric label="Conservative net EV" value={percent(offer.conservative_net_expected_value_percent)} /><Metric label="Minimum odds" value={offer.minimum_acceptable_odds ? offer.minimum_acceptable_odds.toFixed(2) : "—"} /><Metric label="Effective odds" value={offer.effective_odds ? offer.effective_odds.toFixed(2) : "—"} /><span className="manual-price-status">{offer.price_current ? "PRICE CURRENT" : "PRICE NEEDS REFRESH"}</span><p>{offer.disclaimer}</p><small>Suggested capped stake: UGX {ugx.format(offer.suggested_max_stake_ugx)}</small></div> : null}
    </section>

    <section className="terminal-notes"><div><p className="eyebrow">WHAT THE SYSTEM CAN SAY NOW</p><h2>Every number has a separate job.</h2></div><div><b>Football model</b><span>Independent sport data estimate.</span></div><div><b>Market</b><span>De-vigged benchmark, not a confidence score.</span></div><div><b>Conservative</b><span>Lower uncertainty bound used for value gating.</span></div><div><b>Reliability</b><span>Data and model trust signal — never win probability.</span></div></section>
    <footer>ARAwee/MAYEKU-SPORTZ · DEMO / SHADOW MODE · Information is not a promise and no wager is automated.</footer>
  </main>;
}

function scheduleTime(value: string, includeDay: boolean) {
  return new Intl.DateTimeFormat("en-GB", { weekday: includeDay ? "short" : undefined, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin", timeZoneName: "short" }).format(new Date(value));
}

function Quantity({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Health({ label, value, tone }: { label: string; value: string; tone: string }) { return <div><span>{label}</span><strong>{value}</strong><i className={`status-dot ${tone}`} /></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="result-metric"><span>{label}</span><strong>{value}</strong></div>; }
