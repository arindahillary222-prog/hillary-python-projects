from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sentry_sdk

from app.demo import demo_fixture
from app.intelligence import assess_corroboration, demo_evidence
from app.models.quant import evaluate_decision, fractional_kelly
from app.schemas import DataHealth, FixtureSummary, OfferEvaluation, OfferRequest
from app.settings import get_settings

settings = get_settings()
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn.get_secret_value(),
        environment=settings.app_env,
        enable_tracing=False,
        send_default_pii=False,
    )
app = FastAPI(title="Football Intelligence API", version="0.1.0", docs_url="/docs" if settings.app_env != "production" else None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(settings.web_origin).rstrip("/")],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Request-ID"],
)

_requests: dict[str, deque[float]] = defaultdict(deque)


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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "mode": "demo", "time": datetime.now(UTC).isoformat()}


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


@app.post("/api/v1/fixtures/{fixture_id}/evaluate-offer", response_model=OfferEvaluation)
async def evaluate_offer(fixture_id: str, offer: OfferRequest) -> OfferEvaluation:
    fixture = get_demo_fixture_or_404(fixture_id)
    prediction = fixture.prediction
    evaluation = evaluate_decision(
        probability=prediction.probability, offered_odds=offer.decimal_odds,
        reliability=prediction.reliability, agreement=prediction.agreement,
        completeness=fixture.data_health.completeness, freshness=fixture.data_health.freshness,
        lineup_certainty=42, uncertainty_width=prediction.uncertainty_high - prediction.uncertainty_low,
        unresolved_critical_intelligence=False,
    )
    stake_fraction = fractional_kelly(prediction.probability, offer.decimal_odds, offer.fractional_kelly)
    return OfferEvaluation(
        fixture_id=fixture_id, decision=evaluation.state, reasons=list(evaluation.reasons),
        expected_value_percent=round((evaluation.expected_value or 0) * 100, 1),
        fair_odds=round(evaluation.fair_odds or 0, 2),
        suggested_max_stake_ugx=round(offer.weekly_bankroll_ugx * stake_fraction, 0),
        disclaimer="Demo decision-support calculation only. You place any wager manually; no bookmaker is accessed.",
    )


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
    return {"mode": "DEMO", "model_version": "demo-quant-v0.1", "shadow_mode": True, "calibration": "pending historical validation", "recommendations_enabled": False}
