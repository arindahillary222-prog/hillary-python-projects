# AxiomForge acceptance matrix

Status is evidence-based. A row is **PASS** only when the listed behavior has been tested in the stated environment.

| ID | Requirement | Current status | Source | Evidence / blocker |
|---|---|---|---|---|
| P0-01 | Per-project integer revisions; no millisecond timestamp overflow | **IMPLEMENTED, PENDING DEPLOYMENT TEST** | `frontend/app.js`, `supabase/migrations/20261104000000_priority0_persistence_security.sql` | RPC allocates `MAX(revision_number)+1` under a project advisory transaction lock; production consecutive-write test remains pending after deployment. |
| P0-02 | Cloud success waits for project, revision and calculation writes | **IMPLEMENTED, PENDING DEPLOYMENT TEST** | `frontend/app.js` | Save status is set to Saved to Cloud only after the RPC returns success; failures preserve local state. |
| P0-03 | Child rows cannot point to another user's project | **IMPLEMENTED, PENDING TWO-ACCOUNT TEST** | migration RLS, composite ownership FKs | Policies require parent ownership and composite foreign keys bind child `owner_id` to the parent owner. Two authorized accounts are still required for live evidence. |
| P0-04 | Structural V/M/y diagrams are numerical profiles | **IMPLEMENTED LOCALLY, PENDING PUBLIC RETEST** | `frontend/app.js`, `backend/app.py`, `tests/engineering/test_engine.py` | Sampled simply-supported UDL equations include endpoint and extrema checks. |
| P0-05 | Blank BIM does not leak example context | **PASS LOCAL + PUBLIC** | `frontend/app.js` | Playwright verified blank/example/blank switching and hidden example provenance. |
| F-01 | Water HGL uses actual distance/head/elevation values | **FOUNDATION VERIFIED DEPLOYED** | `frontend/app.js` | Deployed correction `0e9d0fd` now labels HGL from 30.000 m to 29.601 m and separately labels residual head above terminal invert as 21.601 m; the linear invert-profile assumption remains explicit. |
| F-02 | Room screen uses dimensioned 3D geometry | **INCOMPLETE** | `frontend/app.js` | Current analytical result is clearly labeled non-CFD, but the dedicated 3D room boundary editor is pending. |
| F-03 | XLSX/CSV/JSON preview, typed mapping and calculation handoff | **FOUNDATION VERIFIED DEPLOYED** | `frontend/app.js` | Deployed correction `0e9d0fd` tested three-row beam batch calculation, result table and deliberate blank-cell rejection (`Row 2: load is blank; blank cells are not zero.`). XLSX worksheet selection uses the same typed path; broader discipline handoff remains pending. |
| F-04 | PDF, IFC and DXF parsing | **INCOMPLETE** | import workspace | No false support claim; parser implementation and fixtures remain pending. |
| F-05 | Auth lifecycle and deletion | **PARTIAL** | `frontend/app.js`, Supabase Auth | Sign-in, signup, reset request and export controls exist; authorized two-account, confirmation and server-side deletion evidence remains pending. |
| F-06 | Full BIM geometry cloud reconstruction | **PARTIAL** | `frontend/app.js` | Cloud reopen now restores all calculation history, revisions, file storage paths and saved model-state metadata when available; actual Three.js scene-graph/material/topology reconstruction and authenticated cross-device evidence remain pending. |
| G-01 | All modules labeled honestly | **PASS for current implemented screens** | `frontend/app.js` | Roadmap and screening labels are used; no full-discipline claim is made. |
| M-01 | Responsive phone/tablet/desktop layout, drawer and page overflow | **PASS AUTOMATED DEPLOYED VIEWPORTS** | `frontend/index.html`, `frontend/styles.css`, `frontend/app.js` | Tested deployed release `3ab4891` at 320, 360, 375, 390, 414, 430, 768, 1024 and 1280 px. Page/body widths matched viewport; mobile drawer opened/closed; 390 px beam calculation and BIM touch-sized controls rendered. Real iOS Safari and Android-device testing remain unavailable in this environment. |

The first sprint remains **INCOMPLETE** until every Section L gate in the master specification is evidenced on production and controlled security tests.
