# Operations, backups and release control

## GitHub workflow

1. Work on a `codex/` feature branch.
2. Run `make test` and `make lint`.
3. Commit logical changes and push the branch.
4. GitHub Actions must pass before merge.
5. Merge through a pull request; Git history is the source and schema-migration backup.

## Database

Use Supabase migrations only. Before production schema changes, pull any existing remote schema once, test locally, inspect advisors, then push migrations. Schedule managed Supabase backups and test restoration before relying on them. Docker's PostgreSQL and Redis ports bind to `127.0.0.1` only, and the local database password must be set in the uncommitted `.env` file.

## Monitoring

Set `SENTRY_DSN` only in API/server environments. Configure alert routing in Sentry after a project exists. Never put a Sentry auth token, provider key, Supabase service-role key, or OpenAI key in the browser bundle.
