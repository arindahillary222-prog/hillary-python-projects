"use client";

import { useCallback, useEffect, useState } from "react";

type LiveUpdate = {
  fixture_id: string | number;
  name: string;
  starting_at: string | null;
  score_count: number;
  event_count: number;
  home_score?: string | number | null;
  away_score?: string | number | null;
  status?: string | null;
};
type LiveFeedResponse = { checked_at: string; cache_seconds: number; provider?: string; updates: LiveUpdate[]; notice: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const POLL_INTERVAL_MS = 30_000;

function checkedTime(value: string | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(value)) : "—";
}

function matchState(update: LiveUpdate) {
  const scoreReady = update.home_score !== null && update.home_score !== undefined && update.away_score !== null && update.away_score !== undefined;
  const score = scoreReady ? `${update.home_score}–${update.away_score}` : "Score pending";
  return `${update.status || "LIVE"} · ${score}`;
}

export function LiveFeed() {
  const [feed, setFeed] = useState<LiveFeedResponse | null>(null);
  const [status, setStatus] = useState<"LOADING" | "LIVE" | "UNAVAILABLE" | "OFFLINE">("LOADING");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!apiUrl) {
      setStatus("UNAVAILABLE");
      return;
    }
    if (!navigator.onLine) {
      setStatus("OFFLINE");
      return;
    }
    setStatus((current) => current === "LIVE" ? "LIVE" : "LOADING");
    setRefreshing(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/live/livescores`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Live feed unavailable");
      setFeed(await response.json() as LiveFeedResponse);
      setStatus("LIVE");
    } catch {
      setStatus(navigator.onLine ? "UNAVAILABLE" : "OFFLINE");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const markOffline = () => setStatus("OFFLINE");
    window.addEventListener("online", refresh);
    window.addEventListener("offline", markOffline);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const intervalId = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", markOffline);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return <section className="live-feed" aria-labelledby="live-feed-title">
    <div className="live-feed-heading"><div><p className="eyebrow">PROTECTED LIVE FOOTBALL FEED</p><h2 id="live-feed-title">Live match monitor.</h2></div><div><span className={`live-status ${status.toLowerCase()}`} aria-live="polite">{status}</span><button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button></div></div>
    {status === "LIVE" && feed ? <><p className="live-feed-note">Source: {feed.provider ?? "protected provider"} · Checked {checkedTime(feed.checked_at)} · Refreshes every {feed.cache_seconds}s while this app is open and online. {feed.notice}</p>{feed.updates.length ? <ul className="live-update-list">{feed.updates.map((update) => <li key={update.fixture_id}><div><strong>{update.name}</strong><span>{matchState(update)}</span></div><span>{update.event_count ? `${update.event_count} provider event${update.event_count === 1 ? "" : "s"}` : "Score-only feed"}</span></li>)}</ul> : <div className="live-empty">No fixture changed in the latest provider update window. This is normal between events.</div>}</> : null}
    {status === "UNAVAILABLE" ? <div className="live-empty">The live feed is temporarily unavailable. The decision desk remains in demo/shadow mode and will not fabricate a score.</div> : null}
    {status === "OFFLINE" ? <div className="live-empty">You are offline. The monitor will reconnect and refresh automatically when internet access returns.</div> : null}
  </section>;
}
