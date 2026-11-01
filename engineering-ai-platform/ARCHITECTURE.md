# Architecture

The current application is a same-origin FastAPI service with a static browser client. `backend/app.py` exposes health, deterministic PV/battery screening, simply supported beam screening, assistant routing and safe OpenAI conversational fallback. `frontend/app.js` owns the Three.js model, BIM metadata, view controls, module workspace registry and API calls. `frontend/index.html` is the page shell and grouped navigation; `frontend/styles.css` is the Quiet Industrial design system.

The model is versioned concept geometry, not a source-confirmed IFC. Each selectable component carries category, level, dimensions, material and provenance metadata. Solar overlays are attached only after a solver response. Structural columns are explicitly hypothetical analytical framing aids and are not presented as source-confirmed design.

The long-term architecture is organized around domain packs: inputs, units, governing method, solver, validation benchmark, visualization and limitations. Durable authentication, database persistence, object storage, isolated code execution, IFC import, geospatial data and substantial FEM/CFD workloads remain future phases.
