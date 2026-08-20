from pathlib import Path


MIGRATION = Path(__file__).resolve().parents[3] / "supabase" / "migrations" / "20260820230420_market_ledger_and_live_terminal.sql"


def test_market_ledger_migration_keeps_new_public_tables_under_rls() -> None:
    sql = MIGRATION.read_text(encoding="utf-8").lower()
    for table in (
        "tax_rules", "market_consensus_snapshots", "prediction_ledger", "execution_ledger",
        "settlement_rule_versions", "execution_settlements", "live_metric_snapshots", "experiment_registry",
    ):
        assert f"alter table public.{table} enable row level security" in sql


def test_prediction_ledger_schema_is_explicitly_append_only() -> None:
    sql = MIGRATION.read_text(encoding="utf-8").lower()
    assert "prediction_ledger is append-only" in sql
    assert "before update or delete on public.prediction_ledger" in sql
