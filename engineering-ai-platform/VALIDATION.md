

## Priority 0 continuation — 2026-11-04

The local Python regression suite passed **13 tests** with one unrelated Starlette deprecation warning. The suite includes the required beam benchmark, exact converted intermediate values and source-level checks that sampled V(x), M(x) and y(x) equations are present.

The existing Supabase project `dzkumrgcuhalnosrhufg` is healthy. Migration `priority0_persistence_security` applied successfully. SQL inspection confirmed `save_calculation_atomic`, `project_revisions_project_owner_fkey`, `calculations_project_owner_fkey` and `project_files_project_owner_fkey`. The project, revision, calculation and file tables contained zero rows at this verification point. An anonymous REST RPC call returned HTTP 401.

Local Playwright verified the following input fixtures: beam `L=4 m, w=5 kN/m, E=200 GPa, I=8333 cm⁴` rendered sampled diagrams with endpoint values `M=0, y=0`, midspan `M=10 kN·m, y=1.000 mm`, and reactions `10 kN`; water `30 m, 2 L/s, 120 m, 80 mm, C=120, rise=8 m` rendered an HGL from `30.000 m` to `21.6007 m` against a stated linear elevation profile; and room `6×4×3 m, ACH=5, inlet=0.30 m², load=1.2 kW` rendered dimensioned analytical room geometry with `Q=0.1000 m³/s`, `v=0.3333 m/s` and `ΔT=9.950°C`. Input edits produced an explicit stale-result message until recalculation.

Production verification of this Priority 0 build remains pending. The two-account tests are intentionally not marked passed because no authorized test credentials were supplied or fabricated. The first sprint remains incomplete.
