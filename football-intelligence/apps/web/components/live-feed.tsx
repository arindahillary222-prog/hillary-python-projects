"use client";

import { useCallback, useEffect, useState } from "react";

type LiveUpdate = { fixture_id: number; name: string; starting_at: string | null; score_count: number; event_count: number };
type LiveFeedResponse = { checked_at: string; cache_seconds: number; updates: LiveUpdate[]; notice: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

function checkedTime(value: string | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(value)) : "—";
}

export function LiveFeed() {
  const [feed, setFeed] = useState<LiveFeedResponse | null>(null);
  const [status, setStatus] = useState<"LOADING" | "LIVE" | "UNAVAILABLE">("LOADING");

  const refresh = useCallback(async () => {
    if (!apiUrl) {
      setStatus("UNAVAILABLE");
      return;
    }
    setStatus("LOADING");
    try {
      const response = await fetch(`${apiUrl}/api/v1/live/livescores`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Live feed unavailable");
      setFeed(await response.json() as LiveFeedResponse);
      setStatus("LIVE");
    } catch {
      setStatus("UNAVAILABLE");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return <section className="live-feed" aria-labelledby="live-feed-title">
    <div className="live-feed-heading"><div><p className="eyebrow">SPORTMONKS · SERVER-SIDE LIVE FEED</p><h2 id="live-feed-title">Latest match changes.</h2></div><div><span className={`live-status ${status.toLowerCase()}`}>{status}</span><button type="button" onClick={() => void refresh()} disabled={status === "LOADING"}>{status === "LOADING" ? "Checking…" : "Refresh"}</button></div></div>
    {status === "LIVE" && feed ? <><p className="live-feed-note">Checked {checkedTime(feed.checked_at)} · Shared cache: {feed.cache_seconds}s. {feed.notice}</p>{feed.updates.length ? <ul className="live-update-list">{feed.updates.slice(0, 8).map((update) => <li key={update.fixture_id}><strong>{update.name}</strong><span>{update.score_count} score update{update.score_count === 1 ? "" : "s"} · {update.event_count} event{update.event_count === 1 ? "" : "s"}</span></li>)}</ul> : <div className="live-empty">No fixture changed in Sportmonks’ latest update window. This is normal between events.</div>}</> : null}
    {status === "UNAVAILABLE" ? <div className="live-empty">The live feed is temporarily unavailable. The decision desk remains in demo/shadow mode and will not fabricate a score.</div> : null}
  </section>;
}
