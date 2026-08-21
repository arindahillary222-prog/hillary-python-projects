"use client";

import { useCallback, useEffect, useState } from "react";
import { matchesProviderFixture } from "./fixture-identity";
import { publicConfig } from "./runtime-config";
import { type Fixture } from "./upcoming-fixtures";

export type LiveUpdate = {
  fixture_id: string | number;
  name: string;
  starting_at: string | null;
  score_count: number;
  event_count: number;
  home_score?: string | number | null;
  away_score?: string | number | null;
  status?: string | null;
};
export type LiveFeedResponse = { checked_at: string; cache_seconds: number; provider?: string; updates: LiveUpdate[]; notice: string };
export type LiveFeedStatus = "LOADING" | "LIVE" | "UNAVAILABLE" | "OFFLINE";

const pollIntervalMs = 30_000;
const listeners = new Set<() => void>();
let feed: LiveFeedResponse | null = null;
let feedStatus: LiveFeedStatus = "LOADING";
let refreshing = false;
let intervalId: number | null = null;
let removeWindowListeners: (() => void) | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

async function refreshLiveFeed() {
  if (!publicConfig.apiUrl) {
    feedStatus = "UNAVAILABLE";
    notify();
    return;
  }
  if (!navigator.onLine) {
    feedStatus = "OFFLINE";
    notify();
    return;
  }
  refreshing = true;
  if (feedStatus !== "LIVE") feedStatus = "LOADING";
  notify();
  try {
    const response = await fetch(`${publicConfig.apiUrl}/api/v1/live/livescores`, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error("Live feed unavailable");
    feed = await response.json() as LiveFeedResponse;
    feedStatus = "LIVE";
  } catch {
    feedStatus = navigator.onLine ? "UNAVAILABLE" : "OFFLINE";
  } finally {
    refreshing = false;
    notify();
  }
}

function startSharedFeed() {
  if (intervalId !== null) return;
  void refreshLiveFeed();
  const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refreshLiveFeed(); };
  const markOffline = () => { feedStatus = "OFFLINE"; notify(); };
  window.addEventListener("online", refreshLiveFeed);
  window.addEventListener("offline", markOffline);
  document.addEventListener("visibilitychange", refreshWhenVisible);
  intervalId = window.setInterval(() => void refreshLiveFeed(), pollIntervalMs);
  const onPageHide = () => {
    window.removeEventListener("online", refreshLiveFeed);
    window.removeEventListener("offline", markOffline);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
  };
  window.addEventListener("pagehide", onPageHide, { once: true });
  removeWindowListeners = () => {
    window.removeEventListener("online", refreshLiveFeed);
    window.removeEventListener("offline", markOffline);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
    window.removeEventListener("pagehide", onPageHide);
  };
}

function stopSharedFeed() {
  if (intervalId !== null) window.clearInterval(intervalId);
  intervalId = null;
  removeWindowListeners?.();
  removeWindowListeners = null;
}

export function useSharedLiveFeed() {
  const [, update] = useState(0);
  useEffect(() => {
    const listener = () => update((value) => value + 1);
    listeners.add(listener);
    startSharedFeed();
    return () => {
      listeners.delete(listener);
      if (!listeners.size) stopSharedFeed();
    };
  }, []);
  return { feed, status: feedStatus, refreshing, refresh: refreshLiveFeed };
}

export function useFixtureLiveState(fixture: Fixture) {
  const state = useSharedLiveFeed();
  const update = state.feed?.provider === "sportmonks"
    ? state.feed.updates.find((candidate) => matchesProviderFixture(fixture.identity, "sportmonks_fixture_id", candidate.fixture_id))
    : undefined;
  return { ...state, update, dataStatus: update && state.status === "LIVE" ? "DATA LIVE" : state.status === "LIVE" ? "DATA DELAYED" : "DATA OFFLINE" };
}
