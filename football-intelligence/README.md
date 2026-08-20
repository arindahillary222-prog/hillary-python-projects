# Football Intelligence

Football Intelligence is a mobile-first, evidence-led decision-support system for pre-match football markets. It is deliberately designed to abstain: `QUALIFIED`, `WATCH`, and `NO BET` are decision states, not promises of an outcome.

The first vertical slice is working in `DEMO` mode with reproducible Poisson/Dixon-Coles, Elo, calibration, value, bankroll, data-quality and decision-gate calculations. It includes provider adapters for Sportmonks, API-Football, The Odds API, and StatsBomb Open Data. No betPawa login, scraping, automation, or bet placement exists anywhere in this project.

## Architecture

```text
Providers / StatsBomb Open Data
        -> validation + timestamp-safe ingestion
        -> Supabase Postgres / PostgreSQL
        -> quantitative models + calibration + gates
        -> FastAPI v1
        -> Next.js mobile PWA dashboard
```

## Quick start

1. Copy `.env.example` to `.env` and set only the providers you have purchased. The app remains usable without them in demo mode.
2. Start PostgreSQL and Redis: `docker compose up -d db redis`
3. In one terminal: `cd apps/api && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000`
4. In another terminal: `cd apps/web && corepack enable && pnpm install --frozen-lockfile && pnpm run dev`
5. Open `http://localhost:3000`.

## Core commands

| Command | Purpose |
| --- | --- |
| `make test` | Run API mathematics, leakage, decision, and API tests |
| `make lint` | Run Python syntax and web type checks |
| `make migrate` | Apply Supabase migrations to a linked project |
| `make ingest` | Import a configured StatsBomb Open Data competition/season |
| `make train` | Run chronological baseline model training |
| `make backtest` | Run strict point-in-time walk-forward evaluation |
| `make dev` | Start local Docker services and show app commands |

## Data and safety

- Every external observation records source, event time, ingestion time, freshness and confidence.
- Models reject features newer than their prediction timestamp. Leakage-test failure is critical.
- The market comparison uses user-entered decimal odds and independent provider odds; it never connects to betPawa.
- The client never receives provider keys or Supabase service-role credentials.
- The public app accesses product data through FastAPI; Supabase RLS is enabled on every exposed table.

## Deployment

GitHub Actions runs tests and production builds for each push and pull request. Create/link a Supabase project before applying migrations. For the web deployment, import the GitHub repository in Vercel and set its **Root Directory** to `football-intelligence/apps/web`; the committed `vercel.json` uses the pinned pnpm build. Deploy the FastAPI container separately (or behind a managed container service) and set `NEXT_PUBLIC_API_URL` to that API origin. Add only the names—not values—listed in `.env.example` as deployment environment variables. Optional Sentry capture activates only when the API receives `SENTRY_DSN`; it deliberately sends no default PII. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) and [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Known initial limitations

The demo dashboard intentionally shows sample calculations, not live predictions. Live Sportmonks and The Odds API ingestion requires the user’s own provider credentials and a linked Supabase project. LLM extraction is deferred until it can be opt-in, sourced, and independently evaluated; numerical probabilities remain quantitative only.
