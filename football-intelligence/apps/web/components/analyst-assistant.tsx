"use client";

import { FormEvent, useState } from "react";

type Decision = "QUALIFIED" | "WATCH" | "NO_BET";
type Calculation = {
  decimal_odds?: number | null; stake_ugx?: number | null; gross_return_ugx?: number | null; gross_profit_ugx?: number | null;
  estimated_tax_ugx?: number | null; potential_net_return_ugx?: number | null; potential_net_profit_ugx?: number | null;
  conservative_expected_net_return_ugx?: number | null; conservative_expected_net_profit_ugx?: number | null;
  net_expected_value_percent?: number | null; conservative_net_expected_value_percent?: number | null;
  minimum_acceptable_odds?: number | null; suggested_max_stake_ugx?: number | null;
};
type AssistantReply = {
  mode: "DEMO" | "LIVE"; data_status: "DEMO_ONLY" | "LIVE_UNAVAILABLE" | "CURRENT";
  answer: string; facts: string[]; decision?: Decision | null; reasons: string[]; calculation?: Calculation | null;
  suggestions: string[]; disclaimer: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const ugx = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });
const starterQuestions = ["Why WATCH?", "Arsenal at 2.20, UGX 10,000", "What is happening live?", "What are the best bets this week?"];

function localReply(question: string): AssistantReply {
  const input = question.trim();
  const normalised = input.toLowerCase();
  const oddsMatch = /\b(?:at|odds?\s*(?:of|is|=)?|@)\s*([1-9]\d*(?:\.\d+)?)\b/i.exec(input);
  const stakeMatch = /\b(?:ugx|ush|shs)\s*([0-9][0-9,]*(?:\.\d+)?)\b/i.exec(input) || /\b([0-9][0-9,]*(?:\.\d+)?)\s*(?:ugx|ush|shs)\b/i.exec(input);
  const odds = oddsMatch ? Number(oddsMatch[1]) : null;
  const stake = stakeMatch ? Number(stakeMatch[1].replaceAll(",", "")) : null;

  if (odds && odds > 1 && stake && stake > 0) {
    const grossReturn = stake * odds;
    const grossProfit = grossReturn - stake;
    const tax = grossProfit * 0.15;
    const netReturn = grossReturn - tax;
    return {
      mode: "DEMO", data_status: "DEMO_ONLY", decision: "WATCH", reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"],
      answer: `For a hypothetical ${ugx.format(stake)} ticket at ${odds.toFixed(2)}, potential net return is ${ugx.format(netReturn)} after the configured 15% demo tax on winnings. This public build cannot verify the live price or market.`,
      facts: [
        `Potential gross return: UGX ${ugx.format(grossReturn)}.`,
        `Potential gross profit: UGX ${ugx.format(grossProfit)}.`,
        `Estimated configured demo tax: UGX ${ugx.format(tax)}.`,
        "This is a payout scenario, not a prediction or a promise of a result.",
      ],
      calculation: { decimal_odds: odds, stake_ugx: stake, gross_return_ugx: grossReturn, gross_profit_ugx: grossProfit, estimated_tax_ugx: tax, potential_net_return_ugx: netReturn, potential_net_profit_ugx: netReturn - stake },
      suggestions: starterQuestions,
      disclaimer: "Built-in deterministic demo calculator. No AI service, bookmaker, or live data provider is used in this public static release.",
    };
  }
  if (["live", "happening", "score", "xg", "lineup", "injury", "news today"].some((term) => normalised.includes(term))) {
    return { mode: "DEMO", data_status: "LIVE_UNAVAILABLE", decision: "WATCH", reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"], answer: "Live data is unavailable. No authorised score, lineup, injury, odds or news provider is connected, so I will not invent an update.", facts: ["Fixture context: Arsenal vs Chelsea.", "Data status: DEMO / LIVE UNAVAILABLE.", "Connect authorised providers before relying on live match information."], suggestions: starterQuestions, disclaimer: "Built-in deterministic demo assistant; missing live facts are never guessed." };
  }
  if (["why", "explain", "watch", "no bet", "qualified", "decision"].some((term) => normalised.includes(term))) {
    return { mode: "DEMO", data_status: "DEMO_ONLY", decision: "WATCH", reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"], answer: "The current decision is WATCH. It is waiting for stronger data, confirmed lineups and a current manually entered price before anything can qualify.", facts: ["Reliability: 70/100; data completeness: 78%.", "Conservative probability: 40.0%.", "Current data is deterministic DEMO data, not a live recommendation."], suggestions: starterQuestions, disclaimer: "Built-in deterministic demo assistant; it does not use a cloud AI service." };
  }
  if (["best bet", "best bets", "week", "strongest", "recommend"].some((term) => normalised.includes(term))) {
    return { mode: "DEMO", data_status: "DEMO_ONLY", decision: "WATCH", reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"], answer: "There are no qualified opportunities. The system is intentionally abstaining until data, lineup and price gates pass.", facts: ["Qualified opportunities: 0.", "Watch list: Arsenal vs Chelsea.", "No fictional ranking is substituted for missing live data."], suggestions: starterQuestions, disclaimer: "Built-in deterministic demo assistant; no cloud AI service is involved." };
  }
  return { mode: "DEMO", data_status: "DEMO_ONLY", decision: "WATCH", reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"], answer: "I can explain the current decision, calculate a hypothetical UGX payout from manual odds, or tell you whether live information is available.", facts: ["Try: “Why WATCH?”", "Try: “Arsenal at 2.20, UGX 10,000”.", "Try: “What is happening live?”"], suggestions: starterQuestions, disclaimer: "Built-in deterministic demo assistant. No cloud AI account or API key is required." };
}

function currency(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `UGX ${ugx.format(value)}`;
}

export function AnalystAssistant() {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;
    setQuestion(trimmed);
    setLoading(true);
    try {
      if (!apiUrl) {
        setReply(localReply(trimmed));
        return;
      }
      const response = await fetch(`${apiUrl}/api/v1/assistant/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ question: trimmed, fixture_id: "demo-ars-che", weekly_bankroll_ugx: 100000 }),
      });
      if (!response.ok) throw new Error("Assistant endpoint unavailable");
      setReply(await response.json() as AssistantReply);
    } catch {
      setReply(localReply(trimmed));
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return <section className="analyst-assistant" aria-labelledby="analyst-title">
    <div className="assistant-heading"><div><p className="eyebrow">BUILT-IN ANALYST · NO CLOUD AI REQUIRED</p><h2 id="analyst-title">Ask the decision desk.</h2><p>Grounded answers from the current model state and repeatable calculations. Missing live facts stay unavailable.</p></div><span className="assistant-mode">{reply?.data_status ?? "DEMO READY"}</span></div>
    <form className="assistant-form" onSubmit={submit}><label htmlFor="analyst-question">Ask about the model, a manual price or a hypothetical payout</label><div><input id="analyst-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={800} placeholder="e.g. Arsenal at 2.20, UGX 10,000" /><button type="submit" disabled={loading}>{loading ? "Checking…" : "Ask analyst"}</button></div></form>
    <div className="assistant-prompts" aria-label="Suggested questions">{starterQuestions.map((prompt) => <button key={prompt} type="button" onClick={() => void ask(prompt)}>{prompt}</button>)}</div>
    {reply ? <div className="assistant-answer" aria-live="polite"><div className="assistant-answer-top"><span className={`state-pill ${(reply.decision ?? "WATCH").toLowerCase()}`}>{reply.decision?.replace("_", " ") ?? "INFO"}</span><span>{reply.mode} · {reply.data_status.replaceAll("_", " ")}</span></div><p className="assistant-main-answer">{reply.answer}</p><ul>{reply.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>{reply.calculation ? <div className="assistant-calculation"><Calc label="Potential gross return" value={currency(reply.calculation.gross_return_ugx)} /><Calc label="Estimated tax" value={currency(reply.calculation.estimated_tax_ugx)} /><Calc label="Potential net return" value={currency(reply.calculation.potential_net_return_ugx)} /><Calc label="Conservative expected return" value={currency(reply.calculation.conservative_expected_net_return_ugx)} /><Calc label="Minimum odds" value={reply.calculation.minimum_acceptable_odds ? reply.calculation.minimum_acceptable_odds.toFixed(2) : "—"} /><Calc label="Conservative net EV" value={reply.calculation.conservative_net_expected_value_percent === null || reply.calculation.conservative_net_expected_value_percent === undefined ? "—" : `${reply.calculation.conservative_net_expected_value_percent >= 0 ? "+" : ""}${reply.calculation.conservative_net_expected_value_percent.toFixed(1)}%`} /></div> : null}<small>{reply.disclaimer}</small></div> : null}
  </section>;
}

function Calc({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
