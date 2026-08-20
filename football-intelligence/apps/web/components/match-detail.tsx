"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const tabs = ["Overview", "Lineups", "Intelligence", "Model", "History"] as const;
type Tab = (typeof tabs)[number];

type Detail = {
  fixture: { competition: string; home_team: string; away_team: string; kickoff_at: string; data_health: { status: string; completeness: number; freshness: number }; prediction: { probability: number; fair_odds: number; reliability: number; agreement: number; decision: string; reasons: string[]; model_version: string } };
  lineup: { status: string; certainty: number; notice: string };
  intelligence: { notice: string; corroboration: string; can_adjust_model: boolean };
  history: { history: { at: string; probability: number; decision: string; reason: string }[] };
};

const fallback: Detail = {
  fixture: { competition: "Premier League", home_team: "Arsenal", away_team: "Chelsea", kickoff_at: "2026-08-24T15:00:00Z", data_health: { status: "AMBER", completeness: 78, freshness: 86 }, prediction: { probability: 0.49, fair_odds: 2.04, reliability: 70, agreement: 86, decision: "WATCH", reasons: ["LINEUPS_UNCERTAIN", "PRICE_REQUIRED"], model_version: "demo-quant-v0.1" } },
  lineup: { status: "PREDICTED", certainty: 42, notice: "Connect a structured provider before treating any lineup as confirmed." },
  intelligence: { notice: "No live news or social provider is configured. Demo evidence cannot change a prediction.", corroboration: "UNCONFIRMED", can_adjust_model: false },
  history: { history: [{ at: "2026-08-21T00:00:00Z", probability: 0.49, decision: "WATCH", reason: "Initial timestamp-safe demo run; no live provider update has occurred." }] },
};

export function MatchDetail({ fixtureId }: { fixtureId: string }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [detail, setDetail] = useState<Detail>(fallback);
  const [connection, setConnection] = useState("DEMO");

  useEffect(() => {
    Promise.all([
      fetch(`${apiUrl}/api/v1/fixtures/${fixtureId}`).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch(`${apiUrl}/api/v1/fixtures/${fixtureId}/lineup`).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch(`${apiUrl}/api/v1/fixtures/${fixtureId}/intelligence`).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch(`${apiUrl}/api/v1/fixtures/${fixtureId}/history`).then((response) => response.ok ? response.json() : Promise.reject()),
    ]).then(([fixture, lineup, intelligence, history]) => {
      setDetail({ fixture, lineup, intelligence, history });
      setConnection("API CONNECTED");
    }).catch(() => setConnection("DEMO"));
  }, [fixtureId]);

  const { fixture, lineup, intelligence, history } = detail;
  return <main>
    <header className="topbar"><Link className="text-link" href="/">← Dashboard</Link><span className="connection demo">{connection}</span></header>
    <section className="hero compact"><p className="eyebrow">MATCH DETAIL · {fixture.competition}</p><h1>{fixture.home_team}<br /><em>vs {fixture.away_team}</em></h1><p className="subtle">Kickoff {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(fixture.kickoff_at))}. Every state is timestamped and updateable.</p></section>
    <nav className="tabs" aria-label="Match detail sections">{tabs.map((item) => <button className={item === tab ? "active" : ""} key={item} type="button" onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === "Overview" && <section className="detail-grid"><article className="panel"><p className="eyebrow">DECISION</p><h2>{fixture.prediction.decision.replace("_", " ")}</h2><p>{fixture.prediction.reasons.map((reason) => reason.replaceAll("_", " ")).join(" · ")}</p></article><article className="panel"><p className="eyebrow">DATA HEALTH</p><h2>{fixture.data_health.status}</h2><p>{fixture.data_health.completeness}% complete · {fixture.data_health.freshness}% fresh</p></article></section>}
    {tab === "Lineups" && <section className="panel"><p className="eyebrow">LINEUP STATE</p><h2>{lineup.status} · {lineup.certainty}% certainty</h2><p>{lineup.notice}</p></section>}
    {tab === "Intelligence" && <section className="panel"><p className="eyebrow">SOURCE PROVENANCE</p><h2>{intelligence.corroboration.replace("_", " ")}</h2><p>{intelligence.notice}</p><p>Automatic model adjustment: <strong>{intelligence.can_adjust_model ? "allowed after corroboration" : "blocked"}</strong></p></section>}
    {tab === "Model" && <section className="detail-grid"><article className="panel"><p className="eyebrow">PROBABILITY</p><h2>{(fixture.prediction.probability * 100).toFixed(1)}%</h2><p>Fair odds {fixture.prediction.fair_odds.toFixed(2)} · Model {fixture.prediction.model_version}</p></article><article className="panel"><p className="eyebrow">RELIABILITY ≠ PROBABILITY</p><h2>{fixture.prediction.reliability}/100</h2><p>{fixture.prediction.agreement}% model agreement, displayed separately from outcome probability.</p></article></section>}
    {tab === "History" && <section className="panel"><p className="eyebrow">WHAT CHANGED?</p>{history.history.map((item) => <div className="history-item" key={item.at}><strong>{new Date(item.at).toLocaleString()} · {(item.probability * 100).toFixed(1)}% · {item.decision}</strong><p>{item.reason}</p></div>)}</section>}
  </main>;
}
