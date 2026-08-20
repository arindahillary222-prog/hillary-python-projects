# Arawee/Mayeku-Sportz upgrade audit

Status date: 2026-08-21. This is an honest implementation audit, not a claim of production readiness.

## Pass 1 — mathematics and models

| Requirement area | Status | Evidence |
| --- | --- | --- |
| Separate football, market, calibrated, conservative and reliability values (1–5) | PASS (demo schema) | `PredictionSummary`, terminal API, dashboard panel |
| Multiple de-vigging and dispersion (6) | PASS | Multiplicative, power, Shin and valid additive methods in `app/models/market.py` |
| Benchmark, consensus, sharp/exchange calibration (7–10) | DEFERRED | Interface/types exist for consensus; requires recorded provider history and lawful access |
| Asian/totals inference and market-bias engines (11–17) | DEFERRED | Settlement supports Asian lines; predictive market engines need historical data |
| Point-in-time snapshots, price expiry and information-arrival plumbing (18–27) | PARTIAL | Snapshot migration, price TTL calculations and API contract; no connected feed |
| Probabilistic lineups and player/tactical models (28–55) | DEFERRED | Existing availability primitives only; no validated player data model yet |
| Dynamic strength, ensemble, calibration and uncertainty (56–71) | PARTIAL | Poisson/Elo/chronological baseline and uncertainty gates exist; production calibration is pending |
| Uganda tax, effective odds and conservative net EV (72–78) | PASS | Versioned tax table and tested net-winnings calculations |
| Execution realism and settlement (79–90) | PASS (rules engine/schema) | Manual execution ledger and tests for 1X2, DNB, BTTS, totals, Asian half outcomes and voids |
| Bankroll, Monte Carlo, correlation and ruin gate (91–100) | DEFERRED | Fractional Kelly cap exists; no validated bankroll simulator/risk gate |

## Pass 2 — temporal and data integrity

| Requirement area | Status | Evidence |
| --- | --- | --- |
| Chronological validation and leakage checks (101–107) | PASS (foundation) | Existing chronological training/backtest and leakage tests |
| Performance intervals, experiments and ablations (108–116) | PARTIAL | Experiment registry migration; bootstrap/ablation reporting is not implemented |
| Empirical reliability, stability and provider agreement (117–128) | DEFERRED | No historical sample sufficiently supports empirical reliability |
| Immutable prediction ledger and audit trail (129–130) | PASS (migration contract) | Append-only trigger plus source/calculation fields; remote DB application is pending |
| In-play temporal safeguards and latency (131–135) | DEFERRED | No authorised live provider has been connected |
| Weather and referee modules (136–137) | PARTIAL | Weather adapter exists; no integrated, validated feature contribution |

## Pass 3 — market and economic realism

| Requirement area | Status | Evidence |
| --- | --- | --- |
| Manual-only betPawa policy (82–83) | PASS | No bookmaker integration; only manual user price evaluation |
| Price snapshots, consensus, odds movement and CLV (18–25, 122) | PARTIAL | Database schema and price-expiry helper exist; no real historical feed/CLV data |
| Theoretical vs executable results and actual ledger (79–80, 158) | PARTIAL | Execution and settlement schema exists; reporting awaits actual user records |
| Settlement rule versioning (84–87) | PASS (engine/schema) | Rule-version table and tested regulation-time settlement engine |
| Promotions separate from selection quality (88–90) | DEFERRED | No promotion calculator, deliberately not mixed into recommendation logic |
| Actual performance, post-match review and noise control (157–161) | DEFERRED | Needs real settled records and protected holdout periods |

## Pass 4 — production and user reliability

| Requirement area | Status | Evidence |
| --- | --- | --- |
| Arawee/Mayeku-Sportz brand and mobile terminal shell (terminal upgrade 1–38, 77) | PASS | PWA metadata, ticker, terminal view, responsive dark interface |
| Live data, SSE/WebSockets, event processor, alerts and replay (terminal upgrade 39–75) | DEFERRED | UI and snapshot schema are in place; no provider or transport is configured, so no fake live data is shown |
| Live truthfulness, provider failure and stale-state handling (terminal upgrade 41–43, 69–72) | PASS (no-feed state) | API explicitly returns `DEMO`/`UNAVAILABLE`; UI freezes rather than fabricates values |
| Data/model health, qualification shutoff and documentation (154–170) | PARTIAL | Dashboard/API gates/docs exist; remote observability and full invariant suite remain pending |
| Security, RLS and provider terms (150–153) | PARTIAL | New public tables have RLS; remote Supabase advisor/RLS verification needs a linked project |
| Full acceptance standard (171–186; terminal 78–82) | DEFERRED | Cannot pass until live data, remote migrations, independent calibration evidence, execution history and production deployment exist |

## Verification performed for this upgrade

- `apps/api/.venv/Scripts/python.exe -m pytest`: **31 passed** (expected after this document’s added migration/API contract tests).
- `pnpm run typecheck`: **pass**.
- Remote Supabase migration/advisors: **blocked** — no linked remote project and no local Docker engine in this workspace.
- Live-provider validation: **deferred** — no authorised provider credentials were supplied.

## Non-negotiable guardrails

1. Never label demo or synthetic values as live.
2. Keep betPawa manual; do not scrape, sign in, submit, or automate wagering.
3. Do not enable `QUALIFIED` on the basis of unvalidated calibration/reliability.
4. Use new append-only prediction rows for changed evidence; never edit past probabilities.
5. Apply an effective-dated tax and settlement rule to historical calculations.
