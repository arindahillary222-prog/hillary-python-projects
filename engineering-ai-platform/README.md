# AxiomForge — Hillary Engineering Software

AxiomForge is an evidence-first engineering workspace for inspectable models, deterministic screening calculations and multidisciplinary project coordination. The live application is available at [axiomforge-engineering.pages.dev](https://axiomforge-engineering.pages.dev/).

## Current release

The current development line is **0.10 / Priority 0 continuation**. It preserves the blank-first workspace, opt-in Mbarara BIM example, WebGL inspection, structural beam screening, water and airflow screens, annual PV screening, grouped navigation, XLSX worksheet preview and Supabase cloud foundation.

The structural workflow now samples numerical shear, moment and deflection profiles for a simply supported uniform-load beam. Water output samples hydraulic grade against actual distance and a stated linear elevation assumption. Airflow output shows dimensioned analytical room geometry and is explicitly not CFD. Every current quantitative screen is labeled screening or foundation and exposes inputs, units, method, assumptions and limitations.

Cloud persistence now uses an authenticated atomic Supabase RPC with monotonic per-project integer revisions. Child tables have parent-ownership constraints and parent-aware policies. The browser waits for required cloud writes before showing `Saved to Cloud`, while local work remains available after offline or partial failure.

## Verification status

The first sprint is **INCOMPLETE**. Local regression and browser checks pass for the current numerical screens and blank/example isolation. Production beam, water, airflow, energy and blank BIM journeys have been verified in earlier releases. Two-account RLS testing, authenticated cross-device recovery, private file retrieval/deletion, PDF/IFC/DXF parsing, server-side account deletion and full BIM scene-graph reconstruction still require evidence.

See [docs/acceptance-matrix.md](docs/acceptance-matrix.md), [docs/first-sprint-status.md](docs/first-sprint-status.md), [ARCHITECTURE.md](ARCHITECTURE.md), [VALIDATION.md](VALIDATION.md) and [CHANGELOG.md](CHANGELOG.md). A realistic rendering or screening number is not a verified construction, operational or professional approval decision.
