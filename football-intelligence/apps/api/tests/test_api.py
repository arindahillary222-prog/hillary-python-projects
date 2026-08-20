from fastapi.testclient import TestClient

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
