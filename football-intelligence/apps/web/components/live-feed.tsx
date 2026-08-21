"use client";

import { type LiveUpdate, useSharedLiveFeed } from "./live-match-state";

function checkedTime(value: string | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(value)) : "—";
}

function matchState(update: LiveUpdate) {
  const scoreReady = update.home_score !== null && update.home_score !== undefined && update.away_score !== null && update.away_score !== undefined;
  const score = scoreReady ? `${update.home_score}–${update.away_score}` : "Score pending";
  return `${update.status || "LIVE"} · ${score}`;
}

export function LiveFeed() {
  const { feed, status, refreshing, refresh } = useSharedLiveFeed();

  return <section className="live-feed" aria-labelledby="live-feed-title">
    <div className="live-feed-heading"><div><p className="eyebrow">PROTECTED LIVE FOOTBALL FEED</p><h2 id="live-feed-title">Live match monitor.</h2></div><div><span className={`live-status ${status.toLowerCase()}`} aria-live="polite">{status}</span><button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button></div></div>
    {status === "LIVE" && feed ? <><p className="live-feed-note">Source: {feed.provider ?? "protected provider"} · Checked {checkedTime(feed.checked_at)} · Refreshes every {feed.cache_seconds}s while this app is open and online. {feed.notice}</p>{feed.updates.length ? <ul className="live-update-list">{feed.updates.map((update) => <li key={update.fixture_id}><div><strong>{update.name}</strong><span>{matchState(update)}</span></div><span>{update.event_count ? `${update.event_count} provider event${update.event_count === 1 ? "" : "s"}` : "Score-only feed"}</span></li>)}</ul> : <div className="live-empty">No fixture changed in the latest provider update window. This is normal between events.</div>}</> : null}
    {status === "UNAVAILABLE" ? <div className="live-empty">The live feed is temporarily unavailable. The decision desk remains in demo/shadow mode and will not fabricate a score.</div> : null}
    {status === "OFFLINE" ? <div className="live-empty">You are offline. The monitor will reconnect and refresh automatically when internet access returns.</div> : null}
  </section>;
}
