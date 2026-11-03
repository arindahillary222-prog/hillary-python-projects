# AxiomForge first-sprint status

This release continues from the existing Supabase project and does not create another project or change the billing plan.

## Implemented in this increment

- Structural beam screen connected to the frontend with span, uniform load, E and I inputs.
- Beam outputs include maximum moment, support shear and maximum deflection.
- Beam SVG contains load, shear, moment and deflection views with units and a display-scale note.
- Beam API returns formula, converted intermediate values and calculation steps.
- Water, airflow, clean-energy and structural result panels expose expandable calculation explanations.
- Clean-energy visualization is an annual balance bar chart with calibrated numeric gridlines and kWh/year labels; it does not imply hourly data.
- Blank BIM mode hides example-only analysis panels and remains isolated when switching to/from the Mbarara example.
- Navigation supports collapsible categories and tool search.
- XLSX upload preview reads workbook sheet names and tabular rows in the browser using SheetJS.
- Cloud project reopening now queries project metadata, revisions, calculations and file metadata, restores the active discipline inputs/results and records the last cloud state locally.
- Cloud save state reports saving, saved-to-cloud, local-pending and cloud-failed outcomes with retries; local records remain when cloud writes fail.
- Password reset and authenticated metadata/calculation export controls are available.
- A reproducible migration is stored at `supabase/migrations/20261103000000_create_axiomforge_private_storage.sql`.

## Evidence

- Backend regression suite: 11 tests passed locally, including the required 4 m / 5 kN/m / 200 GPa / 8,333 cm4 beam benchmark (10 kN-m moment, 10 kN support shear, approximately 1.000 mm deflection).
- Local Playwright: structural calculation, SVG and explanation panel passed.
- Local Playwright: blank BIM mode has no Mbarara text and hides example-only analysis panels; repeated blank/example switching passed.
- Local Playwright: real XLSX fixture with a `Loads` worksheet produced a tabular preview.
- Local browser console contained no errors during the corrected journey.

## Explicitly not marked passed

- Authenticated two-account isolation, cross-device cloud recovery and private file access isolation require two real test accounts and authenticated sessions. No fabricated or unauthorized test credentials were created.
- Account deletion requires a privileged server-side operation and is not exposed through the publishable browser key.
- PDF table extraction, IFC geometry extraction and DXF geometry extraction are not claimed by this release.
- The beam tool remains a screening solver, not a code-compliance, FEM, reinforcement or construction approval workflow.

## Public deployment evidence

After the Pages Function deployment at commit `c9cc202`, the public site was checked at `https://axiomforge-engineering.pages.dev/`. Playwright verified the structural benchmark in production with 10 kN·m moment, 10 kN support shear, 1 mm deflection, SVG diagrams and an expandable derivation. The same public run verified blank BIM isolation. A second public run verified the water benchmark residual head, airflow benchmark flow, annual PV generation of 5,022.4 kWh, SVG outputs and calculation explanations for all three existing engineering workspaces.
