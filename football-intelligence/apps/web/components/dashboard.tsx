"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Decision = "QUALIFIED" | "WATCH" | "NO_BET";
type Fixture = {
  id: string; competition: string; kickoff_at: string; home_team: string; away_team: string; status: string; demo: boolean;
  data_health: { status: "GREEN" | "AMBER" | "RED"; completeness: number; freshness: number; source: string; updated_at: string };
  prediction: { market: string; selection: string; probability: number; fair_odds: number; uncertainty_low: number; uncertainty_high: number; reliability: number; agreement: number; decision: Decision; reasons: string[]; model_version: string };
};
type Offer = { decision: Decision; reasons: string[]; expected_value_percent: number | null; fair_odds: number; suggested_max_stake_ugx: number; disclaimer: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const fallback: Fixture = {
  id: "demo-ars-che", competition: "Premier League", kickoff_at: "2026-08-24T15:00:00Z", home_team: "Arsenal", away_team: "Chelsea", status: "SCHEDULED", demo: true,
  data_health: { status: "AMBER", completeness: 78, freshness: 86, source: "DEMO · StatsBomb-shaped sample", updated_at: "2026-08-21T00:00:00Z" },
  prediction: { market: "1X2", selection: "Arsenal", probability: 0.49, fair_odds: 2.04, uncertainty_low: 0.40, uncertainty_high: 0.58, reliability: 70, agreement: 86, decision: "WATCH", reasons: ["LINEUPS_UNCERTAIN", "PRICE_REQUIRED"], model_version: "demo-quant-v0.1" },
};

const number = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

function StatePill({ state }: { state: Decision }) {
  return <span className={`pill ${state.toLowerCase()}`}>{state.replace("_", " ")}</span>;
}

export function Dashboard() {
  const [fixture, setFixture] = useState<Fixture>(fallback);
  const [price, setPrice] = useState("2.20");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<"live" | "demo">("demo");

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/fixtures`, { headers: { Accept: "application/json" } })
      .then(async (response) => response.ok ? response.json() as Promise<Fixture[]> : Promise.reject(new Error("API unavailable")))
      .then((fixtures) => { if (fixtures[0]) { setFixture(fixtures[0]); setConnection("live"); } })
      .catch(() => setConnection("demo"));
  }, []);

  const kickoff = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(fixture.kickoff_at)), [fixture.kickoff_at]);

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setOffer(null);
    try {
      const response = await fetch(`${apiUrl}/api/v1/fixtures/${fixture.id}/evaluate-offer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decimal_odds: Number(price), weekly_bankroll_ugx: 100000, fractional_kelly: 0.1 }),
      });
      if (!response.ok) throw new Error("Unable to evaluate the price");
      setOffer(await response.json() as Offer);
    } catch {
      setOffer({ decision: "WATCH", reasons: ["API_UNAVAILABLE"], expected_value_percent: null, fair_odds: fixture.prediction.fair_odds, suggested_max_stake_ugx: 0, disclaimer: "Connect the local API to evaluate this manual price. No bookmaker was contacted." });
    } finally { setLoading(false); }
  }

  return <main>
    <header className="topbar">
      <div className="brand"><span className="mark">FI</span><div><strong>FOOTBALL INTELLIGENCE</strong><small>Evidence over excitement</small></div></div>
      <span className={`connection ${connection}`}>{connection === "live" ? "API connected" : "Demo mode"}</span>
    </header>

    <section className="hero">
      <p className="eyebrow">TODAY’S MATCH INTELLIGENCE</p>
      <h1>Wait for evidence.<br /><em>Then judge the price.</em></h1>
      <p className="subtle">This terminal is built to abstain when information is incomplete. It does not promise outcomes or place wagers.</p>
    </section>

    <section className="kpis" aria-label="Dashboard summary">
      <div><span>Matches analysed</span><strong>1</strong></div><div><span>Qualified</span><strong>0</strong></div><div><span>Watch</span><strong>1</strong></div><div><span>Data health</span><strong>{fixture.data_health.status}</strong></div>
    </section>

    <section className="section-heading"><div><p className="eyebrow">MATCH CENTRE</p><h2>Review before any decision</h2></div><span className="source">{fixture.data_health.source}</span></section>

    <article className="match-card">
      <div className="match-header"><div><span className="competition">{fixture.competition}</span><p>{kickoff}</p></div><StatePill state={fixture.prediction.decision} /></div>
      <div className="clubs"><strong>{fixture.home_team}</strong><span>vs</span><strong>{fixture.away_team}</strong></div>
      <div className="market"><span>MODEL MARKET</span><strong>{fixture.prediction.selection} · {fixture.prediction.market}</strong></div>
      <div className="metrics"><Metric label="Model probability" value={`${(fixture.prediction.probability * 100).toFixed(1)}%`} /><Metric label="Fair odds" value={fixture.prediction.fair_odds.toFixed(2)} /><Metric label="Reliability" value={`${fixture.prediction.reliability.toFixed(0)}/100`} /><Metric label="Agreement" value={`${fixture.prediction.agreement.toFixed(0)}/100`} /></div>
      <div className="range"><span>Uncertainty range</span><div><i style={{ left: `${fixture.prediction.uncertainty_low * 100}%` }} /><i style={{ left: `${fixture.prediction.uncertainty_high * 100}%` }} /></div><strong>{(fixture.prediction.uncertainty_low * 100).toFixed(0)}–{(fixture.prediction.uncertainty_high * 100).toFixed(0)}%</strong></div>
      <div className="gates"><span>DECISION GATES</span>{fixture.prediction.reasons.map((reason) => <b key={reason}>{reason.replaceAll("_", " ")}</b>)}</div>
      <Link className="text-link" href={`/fixtures/${fixture.id}`}>Open match detail →</Link>
    </article>

    <section className="detail-grid">
      <article className="panel"><p className="eyebrow">WHY THIS IS {fixture.prediction.decision}</p><h3>Do not force a selection</h3><ul><li>Lineups are not yet confirmed.</li><li>Data coverage is {fixture.data_health.completeness}% — below the qualification threshold.</li><li>Model agreement is shown separately from outcome probability.</li></ul></article>
      <article className="panel"><p className="eyebrow">DATA HEALTH</p><h3>{fixture.data_health.status} · {fixture.data_health.freshness}% fresh</h3><p>All inputs must be timestamp-safe. Future information cannot enter a prediction or backtest.</p><button className="quiet" type="button">View source provenance</button></article>
    </section>

    <section className="offer-card"><div><p className="eyebrow">MANUAL PRICE CHECK</p><h2>Enter current betPawa odds</h2><p>The value calculation happens here. This app does not log in, scrape, click, or place wagers with any bookmaker.</p></div><form onSubmit={evaluate}><label htmlFor="price">Decimal odds</label><div className="input-row"><input id="price" type="number" inputMode="decimal" min="1.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /><button type="submit" disabled={loading}>{loading ? "Checking…" : "Evaluate value"}</button></div></form>
      {offer && <div className="offer-result"><StatePill state={offer.decision} /><strong>{offer.expected_value_percent === null ? "Awaiting price" : `${offer.expected_value_percent >= 0 ? "+" : ""}${offer.expected_value_percent.toFixed(1)}% expected value`}</strong><span>Fair odds {offer.fair_odds.toFixed(2)} · Fractional Kelly cap: UGX {number.format(offer.suggested_max_stake_ugx)}</span><small>{offer.disclaimer}</small></div>}</section>

    <footer>DEMO / SHADOW MODE · Model {fixture.prediction.model_version} · Numbers are decision support, never certainty.</footer>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
