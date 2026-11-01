# Calculation Validation Report

The release includes regression tests for health, solar output, beam output, schema validation, and assistant routing. The solar benchmark is intentionally simple and independently recomputable: 8 kW × 3.5 h/day × 365 × (1 − 0.14) = 8,789.2 kWh/year. The beam formula is documented in source and tested for positive finite output.

“screening_pass” means the implemented checks passed. It does not mean code compliance, structural safety, bankability, or universal physical accuracy. Future releases must add dimensional checks, uncertainty propagation, sensitivity analysis, benchmark cases, solver convergence, and professional review states.
