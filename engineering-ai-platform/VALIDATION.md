# Validation

## Current evidence

- Python regression suite: 6 tests passed.
- JavaScript syntax check: passed with `node --check frontend/app.js`.
- Static artifact and navigation checks: passed.
- Local route manifest: HTTP 200 and valid JSON.
- Public browser check: Mbarara model loaded in a WebGL-capable connected browser with zero console errors after the WebGL capability probe.
- Public interaction checks: technical BIM mode, orthographic camera, floor visibility, section slider, exploded view, material preset, solar overlay and live solar solver.
- Public component check: upper / North external wall selected with dimensions `12.00 × 3.12 × 0.23 m`.
- Public measurement check: tested geometry returned an 8.000 m measured distance.
- Public solar check: default inputs returned 8,789.2 kWh/year and `SCREENING_PASS`.

## Boundaries

The automated Playwright runtime used in the session had WebGL disabled; it was therefore used for DOM/control assertions, while the connected browser verified actual WebGL rendering and selection. Structural, CFD, EPANET, SWMM, code execution, durable persistence and professional standards compliance are not claimed as complete.

## Release 0.6 correction evidence

- Fresh local first-open: neutral `Engineering workspace`, hidden project strip, no benchmark values or active Mbarara project.
- Blank project journey: created `North plant upgrade` with `LOCAL-DRAFT` status.
- Water journey: user-entered 30 m head, 4 L/s, 120 m, 100 mm, C=130, 8 m rise produced `0.4191 m` head loss; changing diameter to 200 mm produced `0.0143 m`, confirming recalculation and result-view change.
- Airflow journey: user-entered 6 × 5 × 3 m room, 6 ACH, 0.3 m² inlet, 2 kW load produced `0.15 m³/s` flow, `0.5 m/s` inlet velocity and `11.056 °C` sensible rise.
- Example isolation: Mbarara remained hidden until explicit Example Projects selection; then loaded with 34 editable components and orthographic control remained functional.
- Backend suite: 10 tests passed after moving the reference suite to `tests/engineering/`.
