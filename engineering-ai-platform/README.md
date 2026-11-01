# AxiomForge — Engineering Intelligence Platform

AxiomForge is the first working release of a multidisciplinary engineering intelligence workspace. It demonstrates a real, inspectable solar-and-battery screen, a real closed-form beam screen, traceable calculation records, explicit assumptions and limitations, and an assistant router that selects deterministic tools instead of inventing numerical results.

## Run locally

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

In another terminal, serve the frontend:

```bash
cd frontend
python3 -m http.server 4173
```

Open `http://localhost:4173`. Run tests from the project root with `pytest -q` after installing the backend requirements.

## Trust boundary

This release is screening software, not a professional design approval or regulatory compliance certificate. Results retain inputs, units, method, solver version, assumptions, limitations, and status. Advanced simulation, persistence, authentication, billing, IFC, and production deployment remain explicitly tracked in `docs/` and the roadmap.
