from __future__ import annotations

import asyncio
import json
import re
import time
import uuid
from dataclasses import dataclass, replace
from typing import Any

from app.ai.provider import AIProvider, AIProviderError, ProviderTurn
from app.ai.tools import FootballToolRegistry, ToolContext, ToolOutcome


class AssistantUnavailable(RuntimeError):
    pass


@dataclass(frozen=True)
class ConversationState:
    fixture_id: str = "demo-ars-che"
    selected_market: str | None = None
    selected_chart: str | None = None
    last_decimal_odds: float | None = None
    last_stake_ugx: float | None = None
    expires_at: float = 0


class ConversationStore:
    """Bounded anonymous context only; raw chat messages are not persisted."""

    _id_pattern = re.compile(r"^[A-Za-z0-9_-]{16,128}$")

    def __init__(self, *, ttl_seconds: int = 1800, max_entries: int = 1_000) -> None:
        self._ttl_seconds = ttl_seconds
        self._max_entries = max_entries
        self._states: dict[str, ConversationState] = {}
        self._lock = asyncio.Lock()

    async def read(self, requested_id: str | None, fallback: ToolContext) -> tuple[str, ConversationState]:
        now = time.monotonic()
        conversation_id = requested_id if requested_id and self._id_pattern.fullmatch(requested_id) else uuid.uuid4().hex
        async with self._lock:
            self._states = {key: value for key, value in self._states.items() if value.expires_at > now}
            state = self._states.get(conversation_id)
            if state is None:
                state = ConversationState(
                    fixture_id=fallback.fixture_id,
                    selected_market=fallback.selected_market,
                    selected_chart=fallback.selected_chart,
                    last_decimal_odds=fallback.last_decimal_odds,
                    last_stake_ugx=fallback.last_stake_ugx,
                    expires_at=now + self._ttl_seconds,
                )
            return conversation_id, state

    async def write(self, conversation_id: str, state: ConversationState) -> None:
        now = time.monotonic()
        async with self._lock:
            if len(self._states) >= self._max_entries:
                oldest = min(self._states, key=lambda key: self._states[key].expires_at, default=None)
                if oldest:
                    self._states.pop(oldest, None)
            self._states[conversation_id] = replace(state, expires_at=now + self._ttl_seconds)


@dataclass(frozen=True)
class AnalystAnswer:
    answer: str
    facts: tuple[str, ...]
    decision: str | None
    reasons: tuple[str, ...]
    calculation: dict[str, float] | None
    evidence: tuple[dict[str, Any], ...]
    tools_used: tuple[str, ...]
    conversation_id: str
    context: ConversationState
    llm_used: bool


class AnalystService:
    def __init__(self, *, provider: AIProvider, tools: FootballToolRegistry | None = None, conversations: ConversationStore | None = None, max_tool_rounds: int = 4) -> None:
        self._provider = provider
        self._tools = tools or FootballToolRegistry()
        self._conversations = conversations or ConversationStore()
        self._max_tool_rounds = max_tool_rounds

    async def answer(self, *, question: str, request_context: ToolContext, conversation_id: str | None) -> AnalystAnswer:
        entered_odds, entered_stake = _extract_entered_numbers(question)
        request_context = ToolContext(
            fixture_id=request_context.fixture_id,
            weekly_bankroll_ugx=request_context.weekly_bankroll_ugx,
            selected_market=request_context.selected_market,
            selected_chart=request_context.selected_chart,
            last_decimal_odds=entered_odds if entered_odds is not None else request_context.last_decimal_odds,
            last_stake_ugx=entered_stake if entered_stake is not None else request_context.last_stake_ugx,
        )
        conversation_id, saved = await self._conversations.read(conversation_id, request_context)
        context = ToolContext(
            fixture_id=request_context.fixture_id or saved.fixture_id,
            weekly_bankroll_ugx=request_context.weekly_bankroll_ugx,
            selected_market=request_context.selected_market or saved.selected_market,
            selected_chart=request_context.selected_chart or saved.selected_chart,
            last_decimal_odds=request_context.last_decimal_odds if request_context.last_decimal_odds is not None else saved.last_decimal_odds,
            last_stake_ugx=request_context.last_stake_ugx if request_context.last_stake_ugx is not None else saved.last_stake_ugx,
        )
        calculator_answer = await self._automatic_calculation(context, conversation_id)
        if calculator_answer is not None:
            return calculator_answer
        system_instruction = _system_instruction(context)
        try:
            turn = await self._provider.create_turn(input_data=question, system_instruction=system_instruction, tools=self._tools.definitions(), require_tool=True)
            history: list[dict[str, Any]] = [{"role": "user", "parts": [{"text": question}]}]
            history.append(turn.history_item)
            outcomes: list[ToolOutcome] = []
            for _ in range(self._max_tool_rounds):
                if not turn.tool_calls:
                    break
                result_parts: list[dict[str, Any]] = []
                for call in turn.tool_calls:
                    if call.name not in {item["name"] for item in self._tools.definitions()}:
                        outcome = ToolOutcome(call.name, {"status": "UNAVAILABLE", "reason": "This function is not permitted."})
                    else:
                        outcome = await self._tools.execute(call.name, call.arguments, context)
                    outcomes.append(outcome)
                    context = _apply_context_updates(context, outcome.context_updates)
                    result_parts.append({
                        "functionResponse": {
                            "name": call.name,
                            "response": outcome.data,
                        },
                    })
                history.append({"role": "user", "parts": result_parts})
                turn = await self._provider.create_turn(input_data=history, system_instruction=system_instruction, tools=self._tools.definitions())
                history.append(turn.history_item)
            if turn.tool_calls:
                raise AssistantUnavailable("The analyst reached its safe tool limit.")
        except AIProviderError as error:
            raise AssistantUnavailable(str(error)) from error

        if not outcomes:
            # Never let a fluent answer imply it consulted application data when
            # the model chose not to request a tool.
            raise AssistantUnavailable("The analyst did not retrieve application evidence.")
        answer = turn.text or "I retrieved the available application evidence, but could not produce a clear summary. Please try again."
        state = ConversationState(
            fixture_id=context.fixture_id,
            selected_market=context.selected_market,
            selected_chart=context.selected_chart,
            last_decimal_odds=context.last_decimal_odds,
            last_stake_ugx=context.last_stake_ugx,
        )
        await self._conversations.write(conversation_id, state)
        return _result_from_outcomes(answer, outcomes, conversation_id, state, llm_used=True)

    async def _automatic_calculation(self, context: ToolContext, conversation_id: str) -> AnalystAnswer | None:
        """Resolve explicit or retained stake/odds with deterministic maths first.

        This avoids waiting for a model to perform arithmetic and guarantees that a
        natural follow-up such as “and at 1.62?” uses the same selected stake.
        """
        if context.last_decimal_odds is None or context.last_stake_ugx is None:
            return None
        evaluation = await self._tools.execute("evaluate_entered_odds", {}, context)
        payout = await self._tools.execute("calculate_payout", {}, context)
        context = _apply_context_updates(context, {**evaluation.context_updates, **payout.context_updates})
        state = ConversationState(
            fixture_id=context.fixture_id,
            selected_market=context.selected_market,
            selected_chart=context.selected_chart,
            last_decimal_odds=context.last_decimal_odds,
            last_stake_ugx=context.last_stake_ugx,
        )
        await self._conversations.write(conversation_id, state)
        calculation = {**(evaluation.calculation or {}), **(payout.calculation or {})}
        decision = evaluation.decision or "WATCH"
        minimum = calculation.get("minimum_acceptable_odds")
        minimum_text = f"{minimum:.2f}" if isinstance(minimum, (int, float)) and minimum else "unavailable"
        return _result_from_outcomes(
            (
                f"At {context.last_decimal_odds:.2f}, a hypothetical UGX {context.last_stake_ugx:,.0f} ticket has a potential net return of "
                f"UGX {calculation.get('potential_net_return_ugx', 0):,.0f} after the configured demo tax. "
                f"The deterministic price evaluation is {decision}; minimum acceptable odds are "
                f"{minimum_text}."
            ),
            [evaluation, payout],
            conversation_id,
            state,
        )


def _system_instruction(context: ToolContext) -> str:
    return f"""You are the Arawee/Mayeku-Sportz football analysis assistant.
You are a conversational explanation layer, never the source of truth. The application's deterministic tools own probabilities, odds thresholds, EV, bankroll, tax, payout and every decision state.

Rules:
- For every application-specific fact, call the relevant tool before answering. Never invent scores, fixtures, odds, probabilities, injuries, lineups, xG, player status, market movement, bankroll values or results.
- If a tool says UNAVAILABLE, state that plainly. Do not infer missing live data from memory or from a schedule.
- Use the calculation tools for every monetary amount. Do not calculate stake, tax, payout or EV yourself.
- High probability is not automatically value. Respect the decision gates, conservative probability and minimum acceptable odds from the tools.
- Explain plainly by default in under 180 words; add only the most relevant risks. Do not promise an outcome or tell a user to place a bet.
- Use only tool results for figures. Label demo information as demo.

Current controlled context: fixture_id={context.fixture_id}; selected_market={context.selected_market or 'none'}; selected_chart={context.selected_chart or 'none'}; last_decimal_odds={context.last_decimal_odds or 'none'}; last_stake_ugx={context.last_stake_ugx or 'none'}.
"""


def _apply_context_updates(context: ToolContext, updates: dict[str, Any]) -> ToolContext:
    return ToolContext(
        fixture_id=str(updates.get("fixture_id", context.fixture_id)),
        weekly_bankroll_ugx=context.weekly_bankroll_ugx,
        selected_market=str(updates["selected_market"]) if updates.get("selected_market") else context.selected_market,
        selected_chart=str(updates["selected_chart"]) if updates.get("selected_chart") else context.selected_chart,
        last_decimal_odds=float(updates["last_decimal_odds"]) if updates.get("last_decimal_odds") is not None else context.last_decimal_odds,
        last_stake_ugx=float(updates["last_stake_ugx"]) if updates.get("last_stake_ugx") is not None else context.last_stake_ugx,
    )


_ODDS_PATTERN = re.compile(r"\b(?:at|odds?\s*(?:of|is|=)?|@)\s*([1-9]\d*(?:\.\d+)?)\b", re.IGNORECASE)
_PREFIX_STAKE_PATTERN = re.compile(r"\b(?:ugx|ush|shs)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(k)?\b", re.IGNORECASE)
_SUFFIX_STAKE_PATTERN = re.compile(r"\b([0-9][0-9,]*(?:\.\d+)?)\s*(k|ugx|ush|shs)\b", re.IGNORECASE)


def _extract_entered_numbers(question: str) -> tuple[float | None, float | None]:
    """Parse only explicit user-entered numbers; calculation still happens in tools."""
    odds_match = _ODDS_PATTERN.search(question)
    stake_match = _PREFIX_STAKE_PATTERN.search(question) or _SUFFIX_STAKE_PATTERN.search(question)
    odds = float(odds_match.group(1)) if odds_match else None
    stake = None
    if stake_match:
        value = float(stake_match.group(1).replace(",", ""))
        multiplier = 1_000 if stake_match.group(2).casefold() == "k" else 1
        stake = value * multiplier
    return (odds if odds and odds > 1 else None), (stake if stake and stake > 0 else None)


def _result_from_outcomes(answer: str, outcomes: list[ToolOutcome], conversation_id: str, context: ConversationState, *, llm_used: bool = False) -> AnalystAnswer:
    evidence: list[dict[str, Any]] = []
    facts: list[str] = []
    used: list[str] = []
    decision: str | None = None
    reasons: tuple[str, ...] = ()
    calculation: dict[str, float] | None = None
    for outcome in outcomes:
        if outcome.name not in used:
            used.append(outcome.name)
        for item in outcome.evidence:
            if item not in evidence:
                evidence.append(item)
        if outcome.decision:
            decision = outcome.decision
            reasons = outcome.reasons
        if outcome.calculation:
            calculation = {**(calculation or {}), **outcome.calculation}
        status = outcome.data.get("status")
        reason = outcome.data.get("reason")
        if status == "UNAVAILABLE" and isinstance(reason, str):
            fact = f"{outcome.name.replace('_', ' ').title()}: unavailable — {reason}"
            if fact not in facts:
                facts.append(fact)
    if calculation:
        facts.insert(0, "Payout, tax and expected-value figures were calculated by the deterministic backend.")
    if not facts:
        facts.append("All app-specific figures in this answer came from the listed server-side tools.")
    return AnalystAnswer(answer, tuple(facts[:6]), decision, reasons, calculation, tuple(evidence), tuple(used), conversation_id, context, llm_used)
