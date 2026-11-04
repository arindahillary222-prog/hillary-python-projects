# AxiomForge acceptance matrix

Status is evidence-based. A row is **PASS** only when the listed behavior has been tested in the stated environment.

| ID | Requirement | Current status | Source | Evidence / blocker |
|---|---|---|---|---|
| P0-01 | Per-project integer revisions; no millisecond timestamp overflow | **IMPLEMENTED, PENDING DEPLOYMENT TEST** | `frontend/app.js`, `supabase/migrations/20261104000000_priority0_persistence_security.sql` | RPC allocates `MAX(revision_number)+1` under a project advisory transaction lock; production consecutive-write test remains pending after deployment. |
| P0-02 | Cloud success waits for project, revision and calculation writes | **IMPLEMENTED, PENDING DEPLOYMENT TEST** | `frontend/app.js` | Save status is set to Saved to Cloud only after the RPC returns success; failures preserve local state. |
| P0-03 | Child rows cannot point to another user's project | **IMPLEMENTED, PENDING TWO-ACCOUNT TEST** | migration RLS, composite ownership FKs | Policies require parent ownership and composite foreign keys bind child `owner_id` to the parent owner. Two authorized accounts are still required for live evidence. |
| P0-04 | Structural V/M/y diagrams are numerical profiles | **IMPLEMENTED LOCALLY, PENDING PUBLIC RETEST** | `frontend/app.js`, `backend/app.py`, `tests/engineering/test_engine.py` | Sampled simply-supported UDL equations include endpoint and extrema checks. |
| P0-05 | Blank BIM does not leak example context | **PASS LOCAL + PUBLIC** | `frontend/app.js` | Playwright verified blank/example/blank switching and hidden example provenance. |
| F-01 | Water HGL uses actual distance/head/elevation values | **INCOMPLETE** | `frontend/app.js` | Current screen still assumes a linear elevation profile; explicit assumption is shown, but sampled HGL replacement is pending. |
| F-02 | Room screen uses dimensioned 3D geometry | **INCOMPLETE** | `frontend/app.js` | Current analytical result is clearly labeled non-CFD, but the dedicated 3D room boundary editor is pending. |
| F-03 | XLSX preview and typed import handoff | **PARTIAL** | `frontend/app.js` | Real worksheet preview passes; typed column mapping and calculation handoff remain pending. |
| F-04 | PDF, IFC and DXF parsing | **INCOMPLETE** | import workspace | No false support claim; parser implementation and fixtures remain pending. |
| F-05 | Auth lifecycle and deletion | **PARTIAL** | `frontend/app.js`, Supabase Auth | Sign-in, signup, reset request and export controls exist; authorized two-account, confirmation and server-side deletion evidence remains pending. |
| F-06 | Full BIM geometry cloud reconstruction | **PARTIAL** | `frontend/app.js` | Editable local wall/slab metadata saves; full scene graph/material/topology restoration remains pending. |
| G-01 | All modules labeled honestly | **PASS for current implemented screens** | `frontend/app.js` | Roadmap and screening labels are used; no full-discipline claim is made. |

The first sprint remains **INCOMPLETE** until every Section L gate in the master specification is evidenced on production and controlled security tests.
