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
