# Modeling policy

The baseline ensemble contains independent quantitative components: Elo, Poisson/Dixon-Coles score probabilities, and a chronologically trained/calibrated logistic-regression baseline. It tracks Brier score, log loss, calibration buckets and agreement dispersion.

No LLM creates, adjusts, or explains a numeric football probability. Any later LLM use is limited to structured extraction from cited text, subject to provenance, corroboration, and ablation testing.

Predictions are saved with model version, feature version, source snapshot identifiers, timestamp, probabilities, uncertainty and explanatory factors. The initial application is in shadow/demo mode until sufficient chronologically held-out evidence exists.

