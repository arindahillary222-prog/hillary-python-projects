

## Priority 0 continuation — 2026-11-04

The existing Supabase project received migration `20261104000000_priority0_persistence_security`. It adds the `save_calculation_atomic` authenticated RPC, per-project monotonic integer revisions allocated under a transaction advisory lock, composite child-to-parent ownership foreign keys and parent-existence RLS checks. Anonymous RPC access returned HTTP 401, the RPC exists, and the current project/revision/calculation/file tables were empty at verification time.

The frontend now looks up canonical cloud UUIDs by local project ID, waits for the atomic revision/calculation RPC before showing `Saved to Cloud`, preserves local work on failure, and reports saving/partial-failure states. It no longer submits `Date.now()` as a revision number.

Structural plots now sample the governing simply-supported UDL equations for shear, moment and deflection. Water output now samples hydraulic grade and a stated linear pipe-elevation profile against actual distance. Airflow output now uses a dimensioned room representation and clearly labels the arrows as analytical flow direction rather than CFD. Calculator results become visibly stale when inputs change before recomputation.

Local evidence after these changes: 13 backend tests passed; local Playwright verified numerical beam profiles, the 10 kN·m / 10 kN / 1.000 mm benchmark, scaled HGL labels, dimensioned room geometry, formula panels and stale-result messaging. Production deployment and two-account authenticated tests remain pending.
