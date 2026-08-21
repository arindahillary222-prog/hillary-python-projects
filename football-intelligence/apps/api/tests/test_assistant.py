from app.assistant import answer_question
from app.demo import demo_fixture


def test_live_question_never_fabricates_an_update() -> None:
    result = answer_question(question="What is happening live with Arsenal?", fixture=demo_fixture(), weekly_bankroll_ugx=100_000)
    assert "Live data is unavailable" in result.answer
    assert "score" in result.answer.lower()
    assert result.calculation is None


def test_watch_explanation_uses_current_reason_codes() -> None:
    result = answer_question(question="Why is this WATCH?", fixture=demo_fixture(), weekly_bankroll_ugx=100_000)
    assert result.decision == "WATCH"
    assert "WATCH_DATA" in result.facts[0]


def test_manual_price_and_payout_are_reproducible() -> None:
    result = answer_question(
        question="Arsenal at 2.20, UGX 10,000",
        fixture=demo_fixture(),
        weekly_bankroll_ugx=100_000,
    )
    assert result.calculation is not None
    assert result.calculation["gross_return_ugx"] == 22_000
    assert result.calculation["estimated_tax_ugx"] == 1_800
    assert result.calculation["potential_net_return_ugx"] == 20_200
    assert result.calculation["minimum_acceptable_odds"] > 1
