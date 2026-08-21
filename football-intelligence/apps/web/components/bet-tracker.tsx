"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { publicConfig } from "./runtime-config";
import { type Fixture } from "./upcoming-fixtures";

type Payout = { gross_return_ugx?: number; gross_profit_ugx?: number; estimated_tax_ugx?: number; potential_net_return_ugx?: number; potential_net_profit_ugx?: number };
type RecordedBet = {
  id: string;
  fixture_id: string;
  platform: string;
  market: string;
  selection: string;
  decimal_odds: number;
  stake_ugx: number;
  placed_at: string;
  pre_match: { probability?: number; conservative_probability?: number; selection: string; market: string };
  payout?: Payout;
};
type AssistantResult = { calculation?: Payout };

const storageKey = "ams-recorded-bets-v1";
const ugx = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

function readStoredBets() {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as RecordedBet[]).filter((bet) => Boolean(bet?.id && bet.fixture_id)) : [];
  } catch {
    return [];
  }
}

async function calculateWithService(fixtureId: string, stake: number, odds: number) {
  if (!publicConfig.apiUrl) throw new Error("Payout service is not configured.");
  const response = await fetch(`${publicConfig.apiUrl}/api/v1/assistant/query/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: `Calculate a hypothetical payout for UGX ${stake} at ${odds.toFixed(2)}`, fixture_id: fixtureId, current_page: "bet_tracker" }),
  });
  if (!response.ok || !response.body) throw new Error("Payout service is unavailable.");
  const content = await new Response(response.body).text();
  const finalFrame = content.split("\n\n").filter((frame) => frame.includes("event: final")).pop();
  const raw = /^data:\s*(.+)$/m.exec(finalFrame || "")?.[1];
  if (!raw) throw new Error("Payout response is incomplete.");
  return JSON.parse(raw) as AssistantResult;
}

export function BetTracker({ fixture, onRecorded }: { fixture: Fixture; onRecorded?: (betId: string | null) => void }) {
  const [bets, setBets] = useState<RecordedBet[]>([]);
  const [platform, setPlatform] = useState("betPawa");
  const [market, setMarket] = useState(fixture.prediction.market);
  const [selection, setSelection] = useState(fixture.prediction.selection);
  const [odds, setOdds] = useState("1.38");
  const [stake, setStake] = useState("20000");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => setBets(readStoredBets()), []);
  useEffect(() => {
    setMarket(fixture.prediction.market);
    setSelection(fixture.prediction.selection);
  }, [fixture.id, fixture.prediction.market, fixture.prediction.selection]);

  const currentBet = useMemo(() => bets.filter((bet) => bet.fixture_id === fixture.id).sort((a, b) => b.placed_at.localeCompare(a.placed_at))[0], [bets, fixture.id]);

  function persist(next: RecordedBet[]) {
    setBets(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { setNotice("Saved for this session only; private device storage is unavailable."); }
  }

  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const decimalOdds = Number(odds);
    const stakeUgx = Number(stake);
    if (!Number.isFinite(decimalOdds) || decimalOdds <= 1 || !Number.isFinite(stakeUgx) || stakeUgx <= 0) {
      setNotice("Enter decimal odds above 1.00 and a positive stake.");
      return;
    }
    setSaving(true);
    setNotice("Calculating potential return…");
    let payout: Payout | undefined;
    try { payout = (await calculateWithService(fixture.id, stakeUgx, decimalOdds)).calculation; } catch { setNotice("Bet saved, but the protected payout service is temporarily unavailable. Retry later to calculate the illustrative return."); }
    const probability = fixture.prediction.final_calibrated_probability ?? fixture.prediction.probability;
    const bet: RecordedBet = {
      id: crypto.randomUUID(), fixture_id: fixture.id, platform: platform.trim() || "Manual entry", market: market.trim() || "Manual market", selection: selection.trim() || "Manual selection", decimal_odds: decimalOdds, stake_ugx: stakeUgx, placed_at: new Date().toISOString(), payout,
      pre_match: { probability, conservative_probability: fixture.prediction.conservative_probability, selection: fixture.prediction.selection, market: fixture.prediction.market },
    };
    persist([...bets, bet]);
    onRecorded?.(bet.id);
    if (payout) setNotice("Saved privately on this device. Potential return is calculated server-side; no wager was placed.");
    setSaving(false);
  }

  function removeCurrent() {
    if (!currentBet) return;
    persist(bets.filter((bet) => bet.id !== currentBet.id));
    onRecorded?.(null);
    setNotice("Recorded bet removed from this device.");
  }

  return <section className="bet-tracker" aria-labelledby="my-bet-title">
    <div><p className="eyebrow">MY BET · MANUAL RECORD</p><h2 id="my-bet-title">Track a ticket, never place one.</h2><p>Bookmaker logins and automatic wagers are not supported.</p></div>
    <form onSubmit={record}>
      <label>Platform<input value={platform} onChange={(event) => setPlatform(event.target.value)} maxLength={60} /></label>
      <label>Market<input value={market} onChange={(event) => setMarket(event.target.value)} maxLength={60} /></label>
      <label>Selection<input value={selection} onChange={(event) => setSelection(event.target.value)} maxLength={80} /></label>
      <label>Decimal odds<input type="number" inputMode="decimal" min="1.01" step="0.01" value={odds} onChange={(event) => setOdds(event.target.value)} required /></label>
      <label>Stake (UGX)<input type="number" inputMode="numeric" min="1" step="1" value={stake} onChange={(event) => setStake(event.target.value)} required /></label>
      <button type="submit" disabled={saving}>{saving ? "Calculating…" : "Record my bet"}</button>
    </form>
    {notice ? <p className="bet-notice" role="status">{notice}</p> : null}
    {currentBet ? <article className="recorded-bet"><div><span>PLATFORM</span><strong>{currentBet.platform}</strong></div><div><span>SELECTION</span><strong>{currentBet.selection} · {currentBet.market}</strong></div><div><span>ODDS / STAKE</span><strong>{currentBet.decimal_odds.toFixed(2)} · UGX {ugx.format(currentBet.stake_ugx)}</strong></div><div><span>LIVE BET STATE</span><strong>PRE-MATCH · DATA UNAVAILABLE</strong></div><div><span>PRE-MATCH SNAPSHOT</span><strong>{currentBet.pre_match.probability === undefined ? "MODEL PENDING" : `${(currentBet.pre_match.probability * 100).toFixed(1)}%`} · {currentBet.pre_match.selection}</strong></div>{currentBet.payout ? <div className="bet-payout"><span>GROSS RETURN</span><strong>UGX {ugx.format(currentBet.payout.gross_return_ugx ?? 0)}</strong><span>EST. TAX</span><strong>UGX {ugx.format(currentBet.payout.estimated_tax_ugx ?? 0)}</strong><span>POTENTIAL NET RETURN</span><strong>UGX {ugx.format(currentBet.payout.potential_net_return_ugx ?? 0)}</strong></div> : null}<button type="button" onClick={removeCurrent}>Remove record</button></article> : null}
  </section>;
}
