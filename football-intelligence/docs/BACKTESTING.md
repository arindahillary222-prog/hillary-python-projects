# Backtesting

Backtests are strict chronological walk-forward evaluations. They do not shuffle football matches. Each feature is checked against its prediction timestamp before a model sees it. Closing odds are evaluation-only and cannot be a feature for earlier predictions.

Every run records model and feature version, training/validation/test windows, model metrics, decision metrics, and data coverage. Leakage failures are critical and block the run.

