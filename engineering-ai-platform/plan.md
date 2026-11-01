# Engineering AI Platform — Release 0.1 Plan

## Product direction

Provisional product name: **AxiomForge**. It is an evidence-first engineering workspace for turning natural-language questions into inspectable calculations, visual scenarios, and project actions. The name is provisional; trademark and domain checks remain open.

## Release scope

This first release is a functional foundation, not a claim that the full multidisciplinary platform is complete. It delivers a real solar-and-battery calculation service, a beam screening calculation, auditable calculation records, scenario comparison, project-management next steps, and a dimensioned WebGL BIM visualization environment with architectural and technical inspection modes. Unsupported capabilities remain visible as roadmap items.

## Architecture

- `frontend/`: responsive browser application using semantic HTML, CSS variables, browser JavaScript, Three.js WebGL geometry and OrbitControls for professional BIM inspection.
- `backend/app.py`: FastAPI service with Pydantic schemas, deterministic engineering functions, validation, provenance fields, and health endpoint.
- `tests/`: Python tests for energy, structural calculations, and API contracts.
- `docs/`: architecture, solver registry, validation, security, pricing, roadmap, limitations, and handover.
- `research/`: competitor research reports from official and independent sources.

The assistant routes requests to deterministic tools first. A provider-independent model adapter can be added later without moving critical calculations into model output.

## Design system

**Alternative directions:** Signal Terminal (0.06); Alpine Instrument (0.08); Quiet Industrial (0.05). Chosen: **Quiet Industrial**.

- **Design Movement:** Swiss-instrumentation minimalism with dark observability surfaces and precise engineering annotation.
- **Core Principles:** evidence before spectacle; progressive disclosure; every number has context; controls show their real state.
- **Color Philosophy:** graphite backgrounds create focus, warm paper panels make calculations legible, and signal lime is reserved for verified or actionable states.
- **Layout Paradigm:** a left command rail and asymmetrical workbench with one dominant scenario canvas and a narrow evidence column.
- **Signature Elements:** lime verification ticks, amber assumption chips, blueprint hairline rules.
- **Interaction Philosophy:** actions are reversible, calculation states are explicit, and results expand to show assumptions.
- **Animation:** 150–250ms transitions, subtle canvas orbit, no decorative loading loops.
- **Typography System:** system sans for UI and IBM Plex Mono for values, units, and trace IDs.
- **Brand Essence:** “Engineering decisions you can inspect.” Precise, candid, enabling.
- **Brand Voice:** “Run the solar screen.” “See the assumptions before you trust the result.”
- **Wordmark & Logo:** an angular A formed by two converging beams with a verification notch.
- **Signature Brand Color:** `#D9FF4A` signal lime.

## Continuation milestones

1. Add persistent PostgreSQL projects, organizations, authentication, and file provenance.
2. Add pvlib/SAM-backed energy workers, IFC inspection, and report generation.
3. Add model-provider adapters, retrieval, citations, and human approval gates.
4. Add durable jobs, billing entitlements, collaboration, monitoring, and deployment hardening.
