from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx


class AIProviderError(RuntimeError):
    """A safe provider failure which never includes credentials or raw payloads."""


@dataclass(frozen=True)
class ToolCall:
    call_id: str
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True)
class ProviderTurn:
    text: str
    tool_calls: tuple[ToolCall, ...]
    history_item: dict[str, Any] = field(default_factory=dict)


class AIProvider(Protocol):
    async def create_turn(self, *, input_data: str | list[dict[str, Any]], system_instruction: str, tools: list[dict[str, Any]], require_tool: bool = False) -> ProviderTurn: ...


class GeminiProvider:
    """Minimal server-only Gemini Generate Content API client.

    The REST client deliberately keeps the API key in an HTTP header and omits it
    from logs, URLs and all values returned to callers.
    """

    def __init__(self, *, api_key: str, model: str, base_url: str, fallback_model: str | None = None) -> None:
        self._api_key = api_key
        self._model = model
        self._fallback_model = fallback_model
        self._base_url = base_url.rstrip("/")

    async def create_turn(self, *, input_data: str | list[dict[str, Any]], system_instruction: str, tools: list[dict[str, Any]], require_tool: bool = False) -> ProviderTurn:
        contents = [{"role": "user", "parts": [{"text": input_data}]}] if isinstance(input_data, str) else input_data
        body = {
            "contents": contents,
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "tools": [{"functionDeclarations": [{key: value for key, value in tool.items() if key != "type"} for tool in tools]}],
            "generationConfig": {"temperature": 0.15, "maxOutputTokens": 900},
        }
        if require_tool:
            body["toolConfig"] = {"functionCallingConfig": {"mode": "ANY"}}
        models = [self._model]
        if self._fallback_model and self._fallback_model != self._model:
            models.append(self._fallback_model)
        last_status: int | None = None
        for index, model in enumerate(models):
            url = f"{self._base_url}/v1beta/models/{model}:generateContent"
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0)) as client:
                    response = await client.post(
                        url,
                        headers={"x-goog-api-key": self._api_key, "Content-Type": "application/json"},
                        json=body,
                    )
            except httpx.HTTPError as error:
                if index + 1 < len(models):
                    continue
                raise AIProviderError("The Gemini service could not be reached.") from error
            if response.status_code < 400:
                try:
                    return _parse_response(response.json())
                except json.JSONDecodeError as error:
                    raise AIProviderError("Gemini returned an unreadable response.") from error
            last_status = response.status_code
            if response.status_code not in {429, 503}:
                break
        # Provider messages can contain implementation details. The API route
        # exposes a stable status instead of passing them to the browser.
        raise AIProviderError(f"Gemini is temporarily unavailable (HTTP {last_status or 503}).")


def _parse_response(payload: dict[str, Any]) -> ProviderTurn:
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates or not isinstance(candidates[0], dict):
        raise AIProviderError("Gemini returned no candidate response.")
    content = candidates[0].get("content")
    if not isinstance(content, dict):
        raise AIProviderError("Gemini returned no response content.")
    parts = content.get("parts")
    if not isinstance(parts, list):
        raise AIProviderError("Gemini returned no response parts.")
    calls: list[ToolCall] = []
    text_parts: list[str] = []
    for index, part in enumerate(parts):
        if not isinstance(part, dict):
            continue
        function_call = part.get("functionCall")
        if isinstance(function_call, dict):
            name = function_call.get("name")
            arguments = function_call.get("args")
            if isinstance(name, str) and isinstance(arguments, dict):
                calls.append(ToolCall(str(function_call.get("id") or f"call-{index}"), name, arguments))
        if isinstance(part.get("text"), str):
            text_parts.append(part["text"])
    return ProviderTurn(text="\n".join(text_parts).strip(), tool_calls=tuple(calls), history_item=content)
