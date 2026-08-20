.PHONY: dev test lint migrate ingest train backtest

dev:
	docker compose up -d db redis
	@echo Start API: cd apps/api && uvicorn app.main:app --reload --port 8000
	@echo Start web: cd apps/web && pnpm run dev

test:
	cd apps/api && python -m pytest -q

lint:
	cd apps/api && python -m compileall -q app tests
	cd apps/web && pnpm run typecheck

migrate:
	supabase db push

ingest:
	cd apps/api && python -m app.ingestion.statsbomb --competition-id 9 --season-id 281 --persist --database-url $$DATABASE_URL

train:
	cd apps/api && python -m app.models.training

backtest:
	cd apps/api && python -m app.models.backtesting
