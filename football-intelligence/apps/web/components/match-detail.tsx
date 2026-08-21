"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InstallApp } from "./install-app";
import { ProbabilityChart } from "./terminal-visuals";
import { fixtureById } from "./upcoming-fixtures";

const tabs = ["Terminal", "Overview", "Intelligence", "Advanced", "History"] as const;
const chartModes = ["Probability", "Market edge", "Odds", "xG", "Momentum", "Reliability", "Model vs market"] as const;
type Tab = (typeof tabs)[number];
type ChartMode = (typeof chartModes)[number];
type Detail = {
  fixture: { competition: string; home_team: string; away_team: string; kickoff_at: string; status: string; data_health: { status: string; completeness: number; freshness: number; updated_at?: string }; prediction: { market: string; selection: string; probability: number; football_model_probability?: number; market_probability?: number; final_calibrated_probability?: number; conservative_probability?: number; market_residual?: number; devig_method_dispersion?: number; fair_odds: number; uncertainty_low: number; uncertainty_high: number; reliability: number; agreement: number; decision: string; reasons: string[]; model_version: string } };
  lineup: { status: string; certainty: number; notice: string };
  intelligence: { notice: string; corroboration: string; can_adjust_model: boolean; items?: { source: string; source_tier: string; observed_at: string; event_type: string }[] };
  history: { history: { at: string; probability: number; decision: string; reason: string }[] };
  terminal: { mode: string; live_data_status: string; connection_status: string; last_updated: string; snapshot: { status: string; score: string | null; minute: number | null; football_model_probability?: number; market_probability?: number; final_calibrated_probability?: number; conservative_probability?: number; reliability: number; market_residual?: number }; timeline: { at: string; probability: number }[]; events: unknown[]; statistics: unknown; notice: string };
};

function fallbackDetail(fixtureId: string): Detail {
  const fixture = fixtureById(fixtureId);
  return {
    fixture: { competition: fixture.competition, home_team: fixture.home_team, away_team: fixture.away_team, kickoff_at: fixture.kickoff_at, status: fixture.status, data_health: fixture.data_health, prediction: fixture.prediction },
    lineup: { status: "PREDICTED", certainty: 0, notice: "No confirmed lineup has been supplied for this scheduled fixture." },
    intelligence: { notice: "No authorised news or social provider is configured. Scheduled fixture data cannot change a prediction.", corroboration: "UNCONFIRMED", can_adjust_model: false, items: [] },
    history: { history: [{ at: "2026-08-21T00:00:00Z", probability: fixture.prediction.probability, decision: "WATCH", reason: "Schedule loaded; no live provider update has occurred." }] },
    terminal: { mode: "SCHEDULE", live_data_status: "UNAVAILABLE", connection_status: "SCHEDULE ONLY", last_updated: "2026-08-21T00:00:00Z", snapshot: { status: "SCHEDULED", score: null, minute: null, football_model_probability: fixture.prediction.football_model_probability, market_probability: fixture.prediction.market_probability, final_calibrated_probability: fixture.prediction.final_calibrated_probability, conservative_probability: fixture.prediction.conservative_probability, reliability: fixture.prediction.reliability, market_residual: fixture.prediction.market_residual }, timeline: [], events: [], statistics: null, notice: "This fixture is on the schedule. Live score, market and statistics data will only appear when an authorised provider supplies them." },
  };
}

function pct(value: number | undefined) { return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`; }
function delta(value: number | undefined) { return value === undefined ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`; }

export function MatchDetail({ fixtureId }: { fixtureId: string }) {
  const [tab, setTab] = useState<Tab>("Terminal");
  const [chartMode, setChartMode] = useState<ChartMode>("Probability");
  const [detail, setDetail] = useState<Detail>(() => fallbackDetail(fixtureId));

  useEffect(() => {
    setDetail(fallbackDetail(fixtureId));
  }, [fixtureId]);

  const { fixture, lineup, intelligence, history, terminal } = detail;
  const prediction = fixture.prediction;
  const points = useMemo(() => terminal.timeline.length ? terminal.timeline.map((point) => ({ value: point.probability * 100, label: new Date(point.at).toLocaleTimeString() })) : history.history.map((item) => ({ value: item.probability * 100, label: new Date(item.at).toLocaleString() })), [terminal.timeline, history.history]);
  const kickoff = useMemo(() => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin", timeZoneName: "short" }).format(new Date(fixture.kickoff_at)), [fixture.kickoff_at]);

  return <main className="terminal-shell match-terminal">
    <header className="terminal-topbar"><Link className="terminal-brand" href="/"><span className="brand-mark">AMS</span><span><strong>Arawee/Mayeku-Sportz</strong><small>Live football terminal</small></span></Link><div className="topbar-status"><InstallApp /><Link className="back-link" href="/">← Desk</Link><span className="mode-flag">SCHEDULE</span></div></header>
    <section className="market-ticker detail-ticker"><span className="ticker-score">{terminal.live_data_status === "LIVE" ? "LIVE" : "PRE"}</span><strong>{fixture.home_team.slice(0, 3).toUpperCase()}–{fixture.away_team.slice(0, 3).toUpperCase()}</strong><span>{prediction.selection} {pct(prediction.final_calibrated_probability ?? prediction.probability)}</span><b className="movement up">{delta(prediction.market_residual)}</b><span className="ticker-notice">{terminal.live_data_status === "LIVE" ? "TIMESTAMPED PROVIDER DATA" : "DEMO DATA · NOT LIVE"}</span></section>

    <section className="match-hero"><div><p className="eyebrow">{fixture.competition} · {fixture.status}</p><h1>{fixture.home_team} <span>vs</span> {fixture.away_team}</h1><p>Kickoff {kickoff}</p></div><div className="score-console"><span>{terminal.live_data_status === "LIVE" ? "LIVE SCORE" : "SCHEDULED"}</span><strong>{terminal.snapshot.score ?? "— – —"}</strong><b>{terminal.snapshot.minute === null ? "AWAITING KICKOFF" : `${terminal.snapshot.minute.toFixed(0)}'`}</b></div></section>
    <div className="terminal-warning"><span className="status-dot amber" /><strong>{terminal.live_data_status === "LIVE" ? "LIVE CONNECTION" : "DEMO DATA — LIVE PROVIDER UNAVAILABLE"}</strong><p>{terminal.notice}</p></div>
    <nav className="terminal-tabs" aria-label="Match detail sections">{tabs.map((item) => <button className={item === tab ? "active" : ""} key={item} type="button" onClick={() => setTab(item)}>{item}</button>)}</nav>

    {tab === "Terminal" ? <section className="live-layout"><div className="terminal-chart-wrap"><div className="chart-controls" aria-label="Chart mode">{chartModes.map((mode) => <button key={mode} type="button" className={mode === chartMode ? "active" : ""} onClick={() => setChartMode(mode)}>{mode}</button>)}</div><ProbabilityChart points={chartMode === "Probability" ? points : []} mode={chartMode} headline={chartMode === "Probability" ? `${prediction.selection} probability` : `${chartMode} history`} /></div><aside className="probability-panel"><p className="eyebrow">CURRENT MODEL STATE</p><ProbabilityRow label="Football model" value={pct(terminal.snapshot.football_model_probability)} /><ProbabilityRow label="Market benchmark" value={pct(terminal.snapshot.market_probability)} /><ProbabilityRow label="Final calibrated" value={pct(terminal.snapshot.final_calibrated_probability)} strong /><ProbabilityRow label="Conservative" value={pct(terminal.snapshot.conservative_probability)} /><ProbabilityRow label="Reliability" value={`${terminal.snapshot.reliability.toFixed(0)}/100`} /><div className="edge-callout"><span>MODEL–MARKET EDGE</span><strong className="movement up">{delta(terminal.snapshot.market_residual)}</strong></div></aside></section> : null}

    {tab === "Terminal" ? <section className="terminal-secondary"><article className="recommendation-box"><p className="eyebrow">PRE-MATCH RECOMMENDATION</p><h2>{prediction.selection} · {prediction.market}</h2><div className="recommendation-metrics"><Metric label="Model" value={pct(prediction.final_calibrated_probability ?? prediction.probability)} /><Metric label="Conservative" value={pct(prediction.conservative_probability)} /><Metric label="Fair odds" value={prediction.fair_odds.toFixed(2)} /><Metric label="Reliability" value={`${prediction.reliability.toFixed(0)}/100`} /></div><span className="state-pill watch">{prediction.decision.replace("_", " ")}</span><p className="note">Enter a current manual price on the desk to calculate tax-adjusted EV and a price expiry time.</p></article><article className="stats-box"><p className="eyebrow">LIVE STATISTICS</p><h2>{terminal.statistics ? "Provider statistics" : "No live statistics"}</h2><p>Shots, xG, possession, cards and player ratings remain unavailable until a provider supplies timestamped data.</p><div className="unavailable-grid"><span>xG — : —</span><span>Shots — : —</span><span>Cards — : —</span><span>Possession — : —</span></div></article><article className="timeline-box"><p className="eyebrow">INTELLIGENCE TIMELINE</p><h2>{terminal.events.length ? "Provider events" : "No live events"}</h2><p>Goals, VAR, cards, substitutions and major market movement will appear here with source timestamps — never simulated.</p></article></section> : null}

    {tab === "Overview" ? <section className="detail-columns"><article className="detail-card"><p className="eyebrow">DECISION GATES</p><h2>{prediction.decision.replace("_", " ")}</h2><div className="reason-list">{prediction.reasons.map((reason) => <span key={reason}>{reason.replaceAll("_", " ")}</span>)}</div><p>Qualification is blocked until all configured gates, including current price and conservative net EV, pass.</p></article><article className="detail-card"><p className="eyebrow">DATA HEALTH</p><h2>{fixture.data_health.status}</h2><Metric label="Completeness" value={`${fixture.data_health.completeness}%`} /><Metric label="Freshness" value={`${fixture.data_health.freshness}%`} /><Metric label="Lineup certainty" value={`${lineup.certainty}%`} /></article></section> : null}

    {tab === "Intelligence" ? <section className="detail-columns"><article className="detail-card"><p className="eyebrow">SOURCE PROVENANCE</p><h2>{intelligence.corroboration.replace("_", " ")}</h2><p>{intelligence.notice}</p><p>Automatic model adjustment: <strong>{intelligence.can_adjust_model ? "allowed after corroboration" : "blocked"}</strong></p></article><article className="detail-card"><p className="eyebrow">LINEUP STATE</p><h2>{lineup.status} · {lineup.certainty}%</h2><p>{lineup.notice}</p></article></section> : null}

    {tab === "Advanced" ? <section className="advanced-grid"><Metric label="Football model probability" value={pct(prediction.football_model_probability)} /><Metric label="De-vigged market probability" value={pct(prediction.market_probability)} /><Metric label="Final calibrated probability" value={pct(prediction.final_calibrated_probability ?? prediction.probability)} /><Metric label="Conservative probability" value={pct(prediction.conservative_probability)} /><Metric label="Uncertainty interval" value={`${pct(prediction.uncertainty_low)}–${pct(prediction.uncertainty_high)}`} /><Metric label="Model agreement" value={`${prediction.agreement.toFixed(0)}/100`} /><Metric label="De-vig dispersion" value={prediction.devig_method_dispersion === undefined ? "—" : `${(prediction.devig_method_dispersion * 100).toFixed(2)} pp`} /><Metric label="Model version" value={prediction.model_version} /></section> : null}

    {tab === "History" ? <section className="ledger-panel"><p className="eyebrow">IMMUTABLE PREDICTION LEDGER</p><h2>What changed, and when?</h2>{history.history.map((item) => <article className="ledger-entry" key={item.at}><span>{new Date(item.at).toLocaleString()}</span><strong>{(item.probability * 100).toFixed(1)}% · {item.decision}</strong><p>{item.reason}</p></article>)}</section> : null}
    <footer>ARAwee/MAYEKU-SPORTZ · {terminal.mode} · Live in-play recommendations remain informational until separately validated.</footer>
  </main>;
}

function ProbabilityRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`probability-row ${strong ? "emphasis" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="detail-metric"><span>{label}</span><strong>{value}</strong></div>; }
