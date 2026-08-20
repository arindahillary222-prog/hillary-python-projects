# Arawee/Mayeku-Sportz

Arawee/Mayeku-Sportz is a mobile-first, evidence-led football intelligence terminal. It is deliberately designed to abstain: `QUALIFIED`, `WATCH`, and `NO BET` are decision states, not promises of an outcome.

The current vertical slice is working in clearly labelled `DEMO` / `SHADOW` mode with reproducible Poisson/Dixon-Coles, Elo, market de-vigging, Uganda net-EV, tax-aware price checks, Asian settlement, data-quality and decision-gate calculations. It includes provider adapters for Sportmonks, API-Football, The Odds API, and StatsBomb Open Data. No betPawa login, scraping, automation, or bet placement exists anywhere in this project.

## Architecture

```text
Providers / StatsBomb Open Data
        -> validation + timestamp-safe ingestion
        -> Supabase Postgres / PostgreSQL
        -> quantitative models + calibration + gates
        -> FastAPI v1 + append-only prediction ledger
        -> Next.js mobile PWA trading terminal
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
- The market comparison keeps football-model, de-vigged market, calibrated, conservative and reliability values separate; it never collapses them into a generic confidence number.
- The manual price check applies a versioned Uganda tax rule to net winnings, expires old prices, and never connects to betPawa.
- The terminal will never render demo observations as live. Scores, time series and live statistics remain unavailable until an authorised provider is configured.
- The client never receives provider keys or Supabase service-role credentials.
- The public app accesses product data through FastAPI; Supabase RLS is enabled on every exposed table.

## Public web release

The public terminal is a static, installable PWA. The release build intentionally contains only the clearly labelled demo/shadow data; it never attempts to call a visitor's `localhost`, connect to a bookmaker, or expose a provider credential.

Users can install it from the app's **Install app** button:

- **iPhone/iPad:** open the shared link in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** open the shared link in Chrome, open the ⋮ menu, then choose **Install app** or **Add to Home screen**.

For a future Pages update, run `pnpm run typecheck && pnpm run build` inside `apps/web`, then deploy the generated `out` folder with `pnpm dlx wrangler@latest pages deploy out --project-name=arawee-mayeku-sportz-hillary`. The existing GitHub Actions workflow continues to test every pushed change; the Pages project is a direct-upload deployment, so releases are published through that explicit command.

Deploy the FastAPI service separately only when an authorised live API is ready, then set `NEXT_PUBLIC_API_URL` at build time to that API's public HTTPS origin. Create/link a Supabase project before applying migrations. Add only the names—not values—listed in `.env.example` as deployment environment variables. Optional Sentry capture activates only when the API receives `SENTRY_DSN`; it deliberately sends no default PII. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md), [docs/OPERATIONS.md](docs/OPERATIONS.md), and [docs/PUBLIC_RELEASE.md](docs/PUBLIC_RELEASE.md).

## Current delivery status

The terminal shell, market layer, immutable ledger migration, versioned tax/settlement schema, and manual execution record structure are implemented and tested. It is **not production-ready**: Supabase has not been linked or migrated remotely, no authorised live provider credentials have been added, no live transport is active, and no out-of-sample calibration/reliability evidence has yet qualified recommendations. See [the upgrade audit](docs/UPGRADE_AUDIT.md) for every implemented, deferred and blocked area.
