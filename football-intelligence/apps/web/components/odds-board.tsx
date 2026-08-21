"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { matchesProviderFixture } from "./fixture-identity";
import { publicConfig } from "./runtime-config";
import { type Fixture } from "./upcoming-fixtures";

type Outcome = { name: string; price: number };
type MarketEvent = {
  event_id: string;
  home_team: string;
  away_team: string;
  commence_time: string | null;
  bookmaker: { name: string; updated_at: string | null; outcomes: Outcome[] } | null;
};
type OddsResponse = { checked_at: string; cache_seconds: number; provider: string; events: MarketEvent[]; notice: string };

const apiUrl = publicConfig.apiUrl;
const POLL_INTERVAL_MS = 5 * 60 * 1000;

function findMarketEvent(fixture: Fixture, events: MarketEvent[]) {
  return events.find((event) => matchesProviderFixture(fixture.identity, "odds_provider_event_id", event.event_id));
}

function checkedTime(value: string | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(value)) : "—";
}

export function OddsBoard({ fixtures }: { fixtures: Fixture[] }) {
  const [feed, setFeed] = useState<OddsResponse | null>(null);
  const [status, setStatus] = useState<"LOADING" | "LIVE" | "UNAVAILABLE">("LOADING");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!apiUrl || !navigator.onLine) {
      setStatus("UNAVAILABLE");
      return;
    }
    setRefreshing(true);
    setStatus((current) => current === "LIVE" ? "LIVE" : "LOADING");
    try {
      const response = await fetch(`${apiUrl}/api/v1/markets/upcoming`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Odds feed unavailable");
      setFeed(await response.json() as OddsResponse);
      setStatus("LIVE");
    } catch {
      setStatus("UNAVAILABLE");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const eventMap = useMemo(() => new Map(fixtures.map((fixture) => [fixture.id, feed ? findMarketEvent(fixture, feed.events) : undefined])), [feed, fixtures]);

  return <section className="odds-board" aria-labelledby="odds-title">
    <div className="odds-heading"><div><p className="eyebrow">UPCOMING MARKETS · DECIMAL ODDS</p><h2 id="odds-title">Current bookmaker prices.</h2><p>1X2 shows the home win, draw, and away win price. Prices are informational only: check them again at your own bookmaker before acting.</p></div><div><span className={`market-status ${status.toLowerCase()}`}>{status}</span><button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh prices"}</button></div></div>
    {status === "LIVE" && feed ? <p className="odds-note">Source: {feed.provider} · Checked {checkedTime(feed.checked_at)} · Refreshes every {Math.round(feed.cache_seconds / 60)} minutes. {feed.notice}</p> : null}
    {status === "UNAVAILABLE" ? <div className="odds-unavailable">Live odds are not connected yet, so no prices are shown. Use the manual price check only with a price you can currently see at your own bookmaker.</div> : null}
    <div className="odds-grid">{fixtures.map((fixture) => { const event = eventMap.get(fixture.id); const bookmaker = event?.bookmaker; return <article className="odds-card" key={fixture.id}><p>{fixture.home_team} vs {fixture.away_team}</p>{bookmaker ? <><span className="bookmaker-name">{bookmaker.name} · 1X2</span><div className="odds-outcomes">{bookmaker.outcomes.map((outcome) => <div key={outcome.name}><span>{outcome.name === fixture.home_team ? "Home" : outcome.name === fixture.away_team ? "Away" : outcome.name}</span><strong>{outcome.price.toFixed(2)}</strong></div>)}</div></> : <div className="odds-pending">{fixture.identity.odds_provider_event_id ? "No current provider price for this fixture." : "Canonical odds-provider mapping pending; no name-only match is used."}</div>}<small>No automatic betting or stake recommendation.</small></article>; })}</div>
  </section>;
}
