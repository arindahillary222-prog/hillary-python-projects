"use client";

import { FormEvent, useEffect, useState } from "react";
import { type Fixture } from "./upcoming-fixtures";

type Decision = "QUALIFIED" | "WATCH" | "NO_BET";
type Calculation = {
  decimal_odds?: number | null; stake_ugx?: number | null; gross_return_ugx?: number | null; gross_profit_ugx?: number | null;
  estimated_tax_ugx?: number | null; potential_net_return_ugx?: number | null; potential_net_profit_ugx?: number | null;
  conservative_expected_net_return_ugx?: number | null; conservative_expected_net_profit_ugx?: number | null;
  net_expected_value_percent?: number | null; conservative_net_expected_value_percent?: number | null;
  minimum_acceptable_odds?: number | null; suggested_max_stake_ugx?: number | null;
};
type Evidence = { label: string; source: string; status: "CURRENT" | "DEMO" | "UNAVAILABLE"; updated_at?: string | null };
type AssistantReply = {
  mode: "DEMO" | "LIVE"; data_status: "DEMO_ONLY" | "LIVE_UNAVAILABLE" | "CURRENT"; answer: string; facts: string[];
  decision?: Decision | null; reasons: string[]; calculation?: Calculation | null; suggestions: string[]; disclaimer: string;
  provider?: "GEMINI" | "DETERMINISTIC"; conversation_id?: string | null; evidence?: Evidence[]; tools_used?: string[];
};
type ChatMessage = { id: string; role: "user" | "analyst"; text: string; reply?: AssistantReply };

const ugx = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });
const starterQuestions = ["Analyse this match", "What odds should I accept?", "Home team at 2.20, UGX 10,000", "Why did probability change?"];
const analystApiUrl = process.env.NEXT_PUBLIC_ANALYST_API_URL?.replace(/\/$/, "");

function localReply(question: string, fixtureName: string): AssistantReply {
  const input = question.trim();
  const normalised = input.toLowerCase();
  const oddsMatch = /\b(?:at|odds?\s*(?:of|is|=)?|@)\s*([1-9]\d*(?:\.\d+)?)\b/i.exec(input);
  const stakeMatch = /\b(?:ugx|ush|shs)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(k)?\b/i.exec(input) || /\b([0-9][0-9,]*(?:\.\d+)?)\s*(k|ugx|ush|shs)\b/i.exec(input);
  const odds = oddsMatch ? Number(oddsMatch[1]) : null;
  const stake = stakeMatch ? Number(stakeMatch[1].replaceAll(",", "")) * (stakeMatch[2]?.toLowerCase() === "k" ? 1000 : 1) : null;

  if (odds && odds > 1 && stake && stake > 0) {
    const grossReturn = stake * odds;
    const grossProfit = grossReturn - stake;
    const tax = grossProfit * 0.15;
    const netReturn = grossReturn - tax;
    return { mode: "DEMO", data_status: "DEMO_ONLY", provider: "DETERMINISTIC", decision: "WATCH", reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"], answer: `For a hypothetical UGX ${ugx.format(stake)} ticket at ${odds.toFixed(2)}, potential net return is UGX ${ugx.format(netReturn)} after the configured 15% demo tax on winnings. The public preview cannot verify a live price or market.`, facts: ["Potential gross return: UGX " + ugx.format(grossReturn) + ".", "Potential gross profit: UGX " + ugx.format(grossProfit) + ".", "Estimated configured demo tax: UGX " + ugx.format(tax) + ".", "This is a payout scenario, not a prediction or a promise of a result."], calculation: { decimal_odds: odds, stake_ugx: stake, gross_return_ugx: grossReturn, gross_profit_ugx: grossProfit, estimated_tax_ugx: tax, potential_net_return_ugx: netReturn, potential_net_profit_ugx: netReturn - stake }, suggestions: starterQuestions, disclaimer: "Offline deterministic calculator. The protected Gemini analyst will activate when its server endpoint is configured." };
  }
  if (["live", "happening", "score", "xg", "lineup", "injury", "news today"].some((term) => normalised.includes(term))) {
    return { mode: "DEMO", data_status: "LIVE_UNAVAILABLE", provider: "DETERMINISTIC", decision: "WATCH", reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"], answer: "No authorised score, lineup, injury, odds or news feed is available for this scheduled fixture, so the analyst will not invent an update.", facts: [`Fixture context: ${fixtureName}.`, "Data status: schedule only; no live match model is active.", "Connect authorised providers before relying on live match information."], suggestions: starterQuestions, disclaimer: "Offline deterministic assistant; missing live facts are never guessed." };
  }
  return { mode: "DEMO", data_status: "DEMO_ONLY", provider: "DETERMINISTIC", decision: "WATCH", reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"], answer: "The protected analyst service is not connected to this public preview yet. I can still explain the schedule state or calculate a hypothetical UGX payout from explicit odds and stake.", facts: [`Fixture context: ${fixtureName}.`, "No fictional ranking is substituted for missing model data.", "Live odds, scores and team news remain unavailable until authorised providers connect."], suggestions: starterQuestions, disclaimer: "Offline deterministic fallback. No cloud AI account is called from this browser." };
}

function currency(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `UGX ${ugx.format(value)}`;
}

async function requestAnalyst(payload: Record<string, unknown>, onStatus: (value: string) => void): Promise<AssistantReply> {
  if (!analystApiUrl) throw new Error("Analyst server is not configured.");
  const response = await fetch(`${analystApiUrl}/api/v1/assistant/query/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok || !response.body) throw new Error("Analyst server is unavailable.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const event = /^event:\s*(.+)$/m.exec(frame)?.[1];
      const raw = /^data:\s*(.+)$/m.exec(frame)?.[1];
      if (!raw) continue;
      const data = JSON.parse(raw) as AssistantReply | { state?: string };
      if (event === "status") onStatus((data as { state?: string }).state === "retrieving_evidence" ? "Checking evidence…" : "Thinking…");
      if (event === "final") return data as AssistantReply;
    }
    if (done) break;
  }
  throw new Error("Analyst response ended early.");
}

export function AnalystAssistant({ fixture }: { fixture: Fixture }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const fixtureName = `${fixture.home_team} vs ${fixture.away_team}`;
  const latestReply = [...messages].reverse().find((message) => message.role === "analyst")?.reply;

  useEffect(() => {
    const key = "ams-analyst-conversation-v1";
    const existing = window.sessionStorage.getItem(key);
    const next = existing || crypto.randomUUID().replaceAll("-", "");
    window.sessionStorage.setItem(key, next);
    setConversationId(next);
  }, []);

  useEffect(() => {
    setMessages([]);
    setQuestion("");
    setStatus("Ready");
  }, [fixture.id]);

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;
    const userMessage: ChatMessage = { id: `${Date.now()}-user`, role: "user", text: trimmed };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setLoading(true);
    setStatus("Checking evidence…");
    let reply: AssistantReply;
    try {
      reply = await requestAnalyst({ question: trimmed, fixture_id: fixture.id, weekly_bankroll_ugx: 100000, conversation_id: conversationId, current_page: "decision_desk", selected_market: fixture.prediction.market }, setStatus);
      if (reply.conversation_id) {
        window.sessionStorage.setItem("ams-analyst-conversation-v1", reply.conversation_id);
        setConversationId(reply.conversation_id);
      }
    } catch {
      reply = localReply(trimmed, fixtureName);
    }
    setMessages((current) => [...current, { id: `${Date.now()}-analyst`, role: "analyst", text: reply.answer, reply }]);
    setLoading(false);
    setStatus("Ready");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  const prompts = latestReply?.suggestions?.length ? latestReply.suggestions : starterQuestions;
  return <section className="analyst-assistant" aria-labelledby="analyst-title">
    <div className="assistant-heading"><div><p className="eyebrow">{analystApiUrl ? "PROTECTED AI ANALYST · SERVER TOOLS" : "OFFLINE ANALYST · PROTECTED AI READY"}</p><h2 id="analyst-title">Ask the decision desk.</h2><p>Context: <strong>{fixtureName}</strong>. Facts and money calculations come from server tools; missing live data stays unavailable.</p></div><span className="assistant-mode">{loading ? status.toUpperCase() : latestReply?.provider === "GEMINI" ? "GEMINI GROUNDED" : "DEMO READY"}</span></div>
    <form className="assistant-form" onSubmit={submit}><label htmlFor="analyst-question">Ask about this match, a manual price, a payout or a decision change</label><div><input id="analyst-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={800} disabled={loading} placeholder="e.g. 10k on the home team at 1.80" /><button type="submit" disabled={loading}>{loading ? status : "Ask analyst"}</button></div></form>
    <div className="assistant-prompts" aria-label="Suggested questions">{prompts.map((prompt) => <button key={prompt} type="button" disabled={loading} onClick={() => void ask(prompt)}>{prompt}</button>)}</div>
    {messages.length ? <div className="assistant-thread" aria-live="polite">{messages.map((message) => message.role === "user" ? <p className="assistant-user-message" key={message.id}>{message.text}</p> : <AnswerCard key={message.id} reply={message.reply!} />)}</div> : null}
  </section>;
}

function AnswerCard({ reply }: { reply: AssistantReply }) {
  return <article className="assistant-answer"><div className="assistant-answer-top"><span className={`state-pill ${(reply.decision ?? "WATCH").toLowerCase()}`}>{reply.decision?.replace("_", " ") ?? "INFO"}</span><span>{reply.provider ?? "DETERMINISTIC"} · {reply.data_status.replaceAll("_", " ")}</span></div><p className="assistant-main-answer">{reply.answer}</p><ul>{reply.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>{reply.calculation ? <div className="assistant-calculation"><Calc label="Potential gross return" value={currency(reply.calculation.gross_return_ugx)} /><Calc label="Estimated tax" value={currency(reply.calculation.estimated_tax_ugx)} /><Calc label="Potential net return" value={currency(reply.calculation.potential_net_return_ugx)} /><Calc label="Conservative expected return" value={currency(reply.calculation.conservative_expected_net_return_ugx)} /><Calc label="Minimum odds" value={reply.calculation.minimum_acceptable_odds ? reply.calculation.minimum_acceptable_odds.toFixed(2) : "—"} /><Calc label="Conservative net EV" value={reply.calculation.conservative_net_expected_value_percent === null || reply.calculation.conservative_net_expected_value_percent === undefined ? "—" : `${reply.calculation.conservative_net_expected_value_percent >= 0 ? "+" : ""}${reply.calculation.conservative_net_expected_value_percent.toFixed(1)}%`} /></div> : null}{reply.evidence?.length ? <div className="assistant-evidence" aria-label="Evidence sources">{reply.evidence.map((item) => <span key={`${item.label}-${item.source}`}>{item.label} · {item.status === "UNAVAILABLE" ? "unavailable" : item.source}</span>)}</div> : null}{reply.tools_used?.length ? <p className="assistant-tools">Checked: {reply.tools_used.map((name) => name.replaceAll("_", " ")).join(" · ")}</p> : null}<small>{reply.disclaimer}</small></article>;
}

function Calc({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
