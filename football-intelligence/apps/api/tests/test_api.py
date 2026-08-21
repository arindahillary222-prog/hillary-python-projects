from fastapi.testclient import TestClient

import app.main as main
from app.ai.service import AssistantUnavailable
from app.main import app


client = TestClient(app)


def test_health_and_fixture_dashboard_are_available() -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.headers["x-content-type-options"] == "nosniff"
    assert health.headers["x-frame-options"] == "DENY"
    response = client.get("/api/v1/fixtures")
    assert response.status_code == 200
    fixture = response.json()[0]
    assert fixture["demo"] is True
    assert fixture["prediction"]["decision"] == "WATCH"


def test_manual_price_evaluation_does_not_contact_bookmaker() -> None:
    fixture_id = "demo-ars-che"
    response = client.post(f"/api/v1/fixtures/{fixture_id}/evaluate-offer", json={"decimal_odds": 2.20})
    assert response.status_code == 200
    result = response.json()
    assert "bookmaker is accessed" in result["disclaimer"]
    assert result["fair_odds"] > 1
    assert result["effective_odds"] > 1
    assert result["conservative_net_expected_value_percent"] is not None
    assert result["price_current"] is True


def test_detail_intelligence_is_explicitly_demo_and_not_model_adjusting() -> None:
    response = client.get("/api/v1/fixtures/demo-ars-che/intelligence")
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "DEMO"
    assert payload["can_adjust_model"] is False


def test_terminal_never_presents_demo_as_live_data() -> None:
    response = client.get("/api/v1/fixtures/demo-ars-che/terminal")
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "DEMO"
    assert payload["live_data_status"] == "UNAVAILABLE"
    assert payload["timeline"] == []


def test_deterministic_assistant_is_explicit_about_demo_data(monkeypatch) -> None:
    monkeypatch.setattr(main, "get_analyst_service", lambda: (_ for _ in ()).throw(AssistantUnavailable("test fallback")))
    response = client.post("/api/v1/assistant/query", json={"question": "Arsenal at 2.20, UGX 10,000"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "DEMO"
    assert payload["data_status"] == "DEMO_ONLY"
    assert payload["calculation"]["potential_net_return_ugx"] == 20_200
    assert payload["provider"] == "DETERMINISTIC"


def test_assistant_marks_live_requests_as_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(main, "get_analyst_service", lambda: (_ for _ in ()).throw(AssistantUnavailable("test fallback")))
    response = client.post("/api/v1/assistant/query", json={"question": "What is happening live?"})
    assert response.status_code == 200
    assert response.json()["data_status"] == "LIVE_UNAVAILABLE"


def test_assistant_stream_returns_a_final_event(monkeypatch) -> None:
    monkeypatch.setattr(main, "get_analyst_service", lambda: (_ for _ in ()).throw(AssistantUnavailable("test fallback")))
    response = client.post("/api/v1/assistant/query/stream", json={"question": "Why WATCH?"})
    assert response.status_code == 200
    assert "event: status" in response.text
    assert "event: final" in response.text
    assert '"provider":"DETERMINISTIC"' in response.text
