from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import UTC, datetime
import json

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import sentry_sdk

from app.assistant import answer_question
from app.ai.provider import GeminiProvider
from app.ai.service import AnalystService, AssistantUnavailable
from app.ai.tools import ToolContext
from app.demo import demo_fixture
from app.intelligence import assess_corroboration, demo_evidence
from app.providers.base import ProviderError
from app.providers.sportmonks import SportmonksProvider
from app.schemas import AssistantContext, AssistantEvidence, AssistantQueryRequest, AssistantResponse, DataHealth, FixtureSummary, LiveScoreResponse, OfferEvaluation, OfferRequest
from app.services.live_scores import LIVE_SCORE_CACHE_SECONDS, SportmonksLiveFeed
from app.services.offer_evaluation import CONFIGURED_TAX_RATE, TAX_POLICY_LABEL, evaluate_manual_offer
from app.settings import get_settings

settings = get_settings()
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn.get_secret_value(),
        environment=settings.app_env,
        enable_tracing=False,
        send_default_pii=False,
    )
app = FastAPI(title="Arawee/Mayeku-Sportz API", version="0.2.0", docs_url="/docs" if settings.app_env != "production" else None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(settings.web_origin).rstrip("/")],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Request-ID"],
)

_requests: dict[str, deque[float]] = defaultdict(deque)
_assistant_requests: dict[str, deque[float]] = defaultdict(deque)
_live_feed: SportmonksLiveFeed | None = None
_analyst_service: AnalystService | None = None


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _requests[client]
    while bucket and bucket[0] < now - 60:
        bucket.popleft()
    if len(bucket) >= 120:
        return JSONResponse({"detail": "Rate limit exceeded."}, status_code=status.HTTP_429_TOO_MANY_REQUESTS)
    bucket.append(now)
    return await call_next(request)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["X-Frame-Options"] = "DENY"
    if settings.app_env == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


def get_demo_fixture_or_404(fixture_id: str) -> FixtureSummary:
    fixture = demo_fixture()
    if fixture.id != fixture_id:
        raise HTTPException(status_code=404, detail="Fixture not found.")
    return fixture


def get_live_feed() -> SportmonksLiveFeed:
    """Create the only Sportmonks client server-side, after configuration is present."""
    global _live_feed
    if _live_feed is None:
        token = settings.sportmonks_token
        if token is None or not token.get_secret_value().strip():
            raise HTTPException(status_code=503, detail="Live scores are not configured.")
        _live_feed = SportmonksLiveFeed(SportmonksProvider(token.get_secret_value()))
    return _live_feed


def get_analyst_service() -> AnalystService:
    """Create the Gemini client on the server only after a private key exists."""
    global _analyst_service
    if _analyst_service is None:
        key = settings.gemini_api_key
        if key is None or not key.get_secret_value().strip():
            raise AssistantUnavailable("The Gemini analyst is not configured.")
        _analyst_service = AnalystService(
            provider=GeminiProvider(
                api_key=key.get_secret_value(),
                model=settings.gemini_model,
                base_url=str(settings.gemini_api_base_url),
                fallback_model=settings.gemini_fallback_model,
            ),
            max_tool_rounds=settings.assistant_max_tool_rounds,
        )
    return _analyst_service


def enforce_assistant_rate_limit(request: Request) -> None:
    """Bound public AI usage independently of normal API traffic."""
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _assistant_requests[client]
    while bucket and bucket[0] < now - 300:
        bucket.popleft()
    if len(bucket) >= 24:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Analyst rate limit exceeded. Try again in a few minutes.")
    bucket.append(now)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "mode": "demo", "time": datetime.now(UTC).isoformat()}


@app.get("/api/v1/live/livescores", response_model=LiveScoreResponse)
async def live_livescores() -> LiveScoreResponse:
    """Return validated live changes; tokens and raw provider payloads never reach clients."""
    try:
        snapshot = await get_live_feed().latest()
    except ProviderError:
        raise HTTPException(status_code=503, detail="Live scores are temporarily unavailable.") from None
    return LiveScoreResponse(
        mode="LIVE",
        provider="sportmonks",
        data_status="CURRENT",
        checked_at=snapshot.checked_at,
        cache_seconds=LIVE_SCORE_CACHE_SECONDS,
        updates=[
            {
                "fixture_id": update.fixture_id,
                "name": update.name,
                "state_id": update.state_id,
                "starting_at": update.starting_at,
                "last_processed_at": update.last_processed_at,
                "score_count": update.score_count,
                "event_count": update.event_count,
            }
            for update in snapshot.updates
        ],
        notice="Sportmonks latest-update feed. Empty updates means no fixture changed in the provider window; it does not mean no football is being played.",
    )


@app.get("/api/v1/fixtures", response_model=list[FixtureSummary])
async def fixtures() -> list[FixtureSummary]:
    return [demo_fixture()]


@app.get("/api/v1/fixtures/{fixture_id}", response_model=FixtureSummary)
async def fixture_detail(fixture_id: str) -> FixtureSummary:
    return get_demo_fixture_or_404(fixture_id)


@app.get("/api/v1/fixtures/{fixture_id}/prediction")
async def fixture_prediction(fixture_id: str) -> dict:
    fixture = get_demo_fixture_or_404(fixture_id)
    return fixture.prediction.model_dump()


@app.get("/api/v1/fixtures/{fixture_id}/intelligence")
async def fixture_intelligence(fixture_id: str) -> dict:
    get_demo_fixture_or_404(fixture_id)
    items = demo_evidence()
    assessment = assess_corroboration(items)
    return {
        "mode": "DEMO",
        "items": [
            {
                "event_type": item.event_type,
                "source": item.source_name,
                "source_url": item.source_url,
                "source_tier": item.source_tier,
                "observed_at": item.observed_at,
                "confidence": item.confidence,
            }
            for item in items
        ],
        "corroboration": assessment.status,
        "can_adjust_model": assessment.can_adjust_model,
        "notice": "No live news or social provider is configured. Demo evidence cannot change a prediction.",
    }


@app.get("/api/v1/fixtures/{fixture_id}/lineup")
async def fixture_lineup(fixture_id: str) -> dict:
    get_demo_fixture_or_404(fixture_id)
    return {
        "mode": "DEMO",
        "status": "PREDICTED",
        "certainty": 42,
        "lineups": [],
        "injuries": [],
        "notice": "No lineup is represented as confirmed until a configured structured provider supplies it.",
    }


@app.get("/api/v1/fixtures/{fixture_id}/odds")
async def fixture_odds(fixture_id: str) -> dict:
    get_demo_fixture_or_404(fixture_id)
    return {
        "mode": "DEMO",
        "snapshots": [],
        "notice": "No independent odds provider is configured. Enter a manual current price to evaluate value.",
    }


@app.get("/api/v1/fixtures/{fixture_id}/history")
async def fixture_prediction_history(fixture_id: str) -> dict:
    fixture = get_demo_fixture_or_404(fixture_id)
    return {
        "mode": "DEMO",
        "history": [{
            "at": fixture.data_health.updated_at,
            "probability": fixture.prediction.probability,
            "decision": fixture.prediction.decision,
            "reason": "Initial timestamp-safe demo run; no live provider update has occurred.",
        }],
    }


@app.get("/api/v1/fixtures/{fixture_id}/terminal")
async def fixture_terminal(fixture_id: str) -> dict:
    """Return an explicitly labelled terminal state without fabricating a live feed."""
    fixture = get_demo_fixture_or_404(fixture_id)
    prediction = fixture.prediction
    return {
        "mode": "DEMO",
        "live_data_status": "UNAVAILABLE",
        "connection_status": "OFFLINE",
        "last_updated": fixture.data_health.updated_at,
        "snapshot": {
            "status": fixture.status,
            "score": None,
            "minute": None,
            "football_model_probability": prediction.football_model_probability,
            "market_probability": prediction.market_probability,
            "final_calibrated_probability": prediction.final_calibrated_probability,
            "conservative_probability": prediction.conservative_probability,
            "reliability": prediction.reliability,
            "market_residual": prediction.market_residual,
        },
        "timeline": [],
        "events": [],
        "statistics": None,
        "notice": "No authorised live-score, market, or statistics provider is configured. The terminal will not simulate live movement.",
    }


@app.post("/api/v1/fixtures/{fixture_id}/evaluate-offer", response_model=OfferEvaluation)
async def evaluate_offer(fixture_id: str, offer: OfferRequest) -> OfferEvaluation:
    fixture = get_demo_fixture_or_404(fixture_id)
    manual_offer = evaluate_manual_offer(
        fixture,
        decimal_odds=offer.decimal_odds,
        weekly_bankroll_ugx=offer.weekly_bankroll_ugx,
        fractional_kelly_fraction=offer.fractional_kelly,
        observed_at=offer.observed_at,
    )
    evaluation = manual_offer.decision
    return OfferEvaluation(
        fixture_id=fixture_id, decision=evaluation.state, reasons=list(evaluation.reasons),
        expected_value_percent=round((evaluation.expected_value or 0) * 100, 1),
        net_expected_value_percent=round((evaluation.net_expected_value or 0) * 100, 1),
        conservative_net_expected_value_percent=round((evaluation.conservative_net_expected_value or 0) * 100, 1),
        effective_odds=round(evaluation.effective_odds or 0, 3),
        minimum_acceptable_odds=round(evaluation.minimum_acceptable_odds or 0, 3),
        price_current=manual_offer.price.is_current,
        price_expires_at=manual_offer.price.expires_at,
        tax_rate_percent=CONFIGURED_TAX_RATE * 100,
        fair_odds=round(evaluation.fair_odds or 0, 2),
        suggested_max_stake_ugx=round(offer.weekly_bankroll_ugx * manual_offer.suggested_stake_fraction, 0),
        disclaimer=f"Demo decision-support calculation only. The {TAX_POLICY_LABEL} is applied for this illustration. You place any wager manually; no bookmaker is accessed.",
    )


def deterministic_assistant_response(query: AssistantQueryRequest) -> AssistantResponse:
    try:
        fixture = get_demo_fixture_or_404(query.fixture_id)
    except HTTPException:
        return AssistantResponse(
            mode="DEMO",
            data_status="LIVE_UNAVAILABLE",
            answer="This fixture does not yet have a server-side model record, so the fallback analyst cannot analyse it without inventing data.",
            facts=["Fixture model record: unavailable.", "Connect a verified fixture, odds and statistics source before requesting an analysis."],
            decision=None,
            reasons=[],
            suggestions=["Analyse the demo match", "What data is missing?"],
            disclaimer="Deterministic fallback. No fixture data was substituted or invented.",
            provider="DETERMINISTIC",
            conversation_id=query.conversation_id,
            context=AssistantContext(fixture_id=query.fixture_id, selected_market=query.selected_market, selected_chart=query.selected_chart),
        )
    result = answer_question(
        question=query.question,
        fixture=fixture,
        weekly_bankroll_ugx=query.weekly_bankroll_ugx,
    )
    return AssistantResponse(
        mode="DEMO",
        data_status=result.data_status,
        answer=result.answer,
        facts=list(result.facts),
        decision=result.decision,
        reasons=list(result.reasons),
        calculation=result.calculation,
        suggestions=[
            "Why WATCH?",
            "Arsenal at 2.20, UGX 10,000",
            "What is happening live?",
            "What are the best bets this week?",
        ],
        disclaimer="Deterministic fallback. Gemini was unavailable; no bookmaker is accessed and missing live data is never presented as fact.",
        provider="DETERMINISTIC",
        conversation_id=query.conversation_id,
        context=AssistantContext(fixture_id=query.fixture_id, selected_market=query.selected_market, selected_chart=query.selected_chart),
    )


async def build_analyst_response(query: AssistantQueryRequest) -> AssistantResponse:
    try:
        result = await get_analyst_service().answer(
            question=query.question,
            request_context=ToolContext(
                fixture_id=query.fixture_id,
                weekly_bankroll_ugx=query.weekly_bankroll_ugx,
                selected_market=query.selected_market,
                selected_chart=query.selected_chart,
            ),
            conversation_id=query.conversation_id,
        )
    except AssistantUnavailable:
        return deterministic_assistant_response(query)
    evidence = [
        AssistantEvidence(
            label=item["label"], source=item["source"], status=item["status"],
            updated_at=datetime.fromisoformat(item["updated_at"]) if item.get("updated_at") else None,
        )
        for item in result.evidence
    ]
    return AssistantResponse(
        mode="DEMO",
        data_status="DEMO_ONLY",
        answer=result.answer,
        facts=list(result.facts),
        decision=result.decision,
        reasons=list(result.reasons),
        calculation=result.calculation,
        suggestions=[
            "Analyse this match",
            "What odds should I accept?",
            "Home team at 2.20, UGX 10,000",
            "Why did probability change?",
        ],
        disclaimer=("Gemini explains only data retrieved through Arawee/Mayeku-Sportz server tools. Demo data is not live advice; no outcome is guaranteed." if result.llm_used else "Deterministic calculation from Arawee/Mayeku-Sportz server tools. Demo data is not live advice; no outcome is guaranteed."),
        provider="GEMINI" if result.llm_used else "DETERMINISTIC",
        conversation_id=result.conversation_id,
        evidence=evidence,
        tools_used=list(result.tools_used),
        context=AssistantContext(
            fixture_id=result.context.fixture_id,
            selected_market=result.context.selected_market,
            selected_chart=result.context.selected_chart,
            last_decimal_odds=result.context.last_decimal_odds,
            last_stake_ugx=result.context.last_stake_ugx,
        ),
    )


@app.post("/api/v1/assistant/query", response_model=AssistantResponse)
async def analyst_assistant(query: AssistantQueryRequest, request: Request) -> AssistantResponse:
    enforce_assistant_rate_limit(request)
    return await build_analyst_response(query)


@app.post("/api/v1/assistant/query/stream")
async def analyst_assistant_stream(query: AssistantQueryRequest, request: Request) -> StreamingResponse:
    """SSE-compatible response lifecycle for the terminal chat UI.

    Tool execution is intentionally completed server-side before final content is
    emitted, so partial text can never imply facts which later tool data refutes.
    """
    enforce_assistant_rate_limit(request)

    async def events():
        yield "event: status\ndata: {\"state\":\"retrieving_evidence\"}\n\n"
        response = await build_analyst_response(query)
        yield f"event: final\ndata: {json.dumps(response.model_dump(mode='json'), separators=(',', ':'))}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/v1/recommendations")
async def recommendations() -> dict:
    fixture = demo_fixture()
    return {"mode": "DEMO", "qualified": [], "watch": [fixture], "no_bet_count": 0, "note": "The engine abstains until its data and price gates pass."}


@app.get("/api/v1/data/health", response_model=list[DataHealth])
async def data_health() -> list[DataHealth]:
    fixture = demo_fixture()
    return [fixture.data_health]


@app.get("/api/v1/alerts")
async def alerts() -> dict:
    return {
        "mode": "DEMO",
        "alerts": [],
        "provider_status": "No live alert sources configured; no synthetic alert is presented as a real event.",
    }


@app.get("/api/v1/models/health")
async def model_health() -> dict:
    return {"mode": "DEMO", "model_version": "demo-quant-v0.2", "shadow_mode": True, "calibration": "pending historical validation", "recommendations_enabled": False, "live_recommendations_enabled": False}
