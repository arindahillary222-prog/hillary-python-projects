import asyncio

import pytest

from app.ai.provider import ProviderTurn, ToolCall, _parse_response
from app.ai.service import AnalystService, AssistantUnavailable, _extract_entered_numbers
from app.ai.tools import FootballToolRegistry, ToolContext


class ScriptedProvider:
    def __init__(self, turns):
        self.turns = list(turns)
        self.calls = []

    async def create_turn(self, *, input_data, system_instruction, tools, require_tool=False):
        self.calls.append({"input": input_data, "instruction": system_instruction, "tools": tools, "require_tool": require_tool})
        return self.turns.pop(0)


class NeverCalledProvider:
    async def create_turn(self, **kwargs):
        raise AssertionError("Explicit money calculations must not depend on an LLM.")


def test_gemini_orchestration_returns_tool_grounded_answer() -> None:
    provider = ScriptedProvider([
        ProviderTurn(text="", tool_calls=(ToolCall("prediction-1", "get_match_prediction", {"fixture_id": "demo-ars-che"}),), history_item={"role": "model", "parts": []}),
        ProviderTurn(text="The current model state is WATCH because the required gates are not all clear.", tool_calls=(), history_item={"role": "model", "parts": []}),
    ])
    service = AnalystService(provider=provider, tools=FootballToolRegistry())

    result = asyncio.run(service.answer(question="Why is this a watch?", request_context=ToolContext(), conversation_id=None))

    assert result.decision == "WATCH"
    assert result.tools_used == ("get_match_prediction",)
    assert result.evidence[0]["label"] == "Prediction engine"
    assert "source of truth" in provider.calls[0]["instruction"]


def test_payout_uses_deterministic_tool_result_not_model_math() -> None:
    result = asyncio.run(AnalystService(provider=NeverCalledProvider()).answer(question="10k at 1.8", request_context=ToolContext(), conversation_id=None))

    assert result.calculation is not None
    assert result.calculation["gross_return_ugx"] == 18_000
    assert result.calculation["estimated_tax_ugx"] == 1_200
    assert result.calculation["potential_net_return_ugx"] == 16_800


def test_assistant_refuses_ungrounded_model_answer() -> None:
    provider = ScriptedProvider([ProviderTurn(text="Trust me.", tool_calls=(), history_item={"role": "model", "parts": []})])
    with pytest.raises(AssistantUnavailable, match="did not retrieve"):
        asyncio.run(AnalystService(provider=provider).answer(question="What is happening?", request_context=ToolContext(), conversation_id=None))


def test_unknown_fixture_is_reported_unavailable() -> None:
    outcome = asyncio.run(FootballToolRegistry().execute("get_match_prediction", {"fixture_id": "not-a-real-record"}, ToolContext()))
    assert outcome.data["status"] == "UNAVAILABLE"
    assert "not-a-real-record" in outcome.data["fixture_id"]


def test_compact_ugx_stake_and_odds_are_retained_for_a_follow_up() -> None:
    assert _extract_entered_numbers("10k on Arsenal at 1.8") == (1.8, 10_000)
    assert _extract_entered_numbers("And at odds of 1.62?") == (1.62, None)


def test_conversation_keeps_stake_for_an_odds_follow_up() -> None:
    service = AnalystService(provider=NeverCalledProvider())
    conversation_id = "context-follow-up-1234"
    first = asyncio.run(service.answer(question="10k at 1.8", request_context=ToolContext(), conversation_id=conversation_id))
    follow_up = asyncio.run(service.answer(question="And at odds of 1.62?", request_context=ToolContext(), conversation_id=conversation_id))

    assert first.calculation["stake_ugx"] == 10_000
    assert follow_up.calculation["decimal_odds"] == 1.62
    assert follow_up.calculation["stake_ugx"] == 10_000


def test_gemini_generate_content_function_response_is_parsed() -> None:
    turn = _parse_response({
        "candidates": [{
            "content": {
                "role": "model",
                "parts": [{
                    "functionCall": {
                        "id": "tool-1",
                        "name": "get_match_prediction",
                        "args": {"fixture_id": "demo-ars-che"},
                    },
                }],
            },
        }],
    })

    assert turn.tool_calls == (ToolCall("tool-1", "get_match_prediction", {"fixture_id": "demo-ars-che"}),)
