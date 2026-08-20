# Data sources

## Provider rules

Providers are adapters, not model dependencies. A failing provider lowers data quality and may force `WATCH` or `NO BET`; it never silently fabricates a replacement value.

| Source | Role | Status | Credential |
| --- | --- | --- | --- |
| Sportmonks Football API v3 | Primary fixtures, lineups, injuries and match facts | Ready adapter | `SPORTMONKS_TOKEN` |
| API-Football v3 | Secondary structured-football adapter | Ready adapter | `API_FOOTBALL_KEY` |
| The Odds API | Independent odds snapshots and historical comparison | Ready adapter | `THE_ODDS_API_KEY` |
| StatsBomb Open Data | Development and historical research import | Working, no key; validated match import and optional PostgreSQL persistence | none |
| GDELT / licensed RSS | Optional factual intelligence | Intelligence/provenance core ready; connector deferred pending credentials/terms | configuration dependent |
| Open-Meteo | Forecast-only weather enrichment | Ready adapter, no key | none |

## Verified interfaces

- Sportmonks Football API v3 exposes fixtures under `/v3/football/fixtures` and documents fixture enrichment through explicit `include` parameters for participants, events, lineups, statistics, expected lineups and sidelined players. [Official docs](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints)
- The Odds API documents `GET /odds/` with an `x-api-key` header, a `sport_key`, and `markets` such as `h2h` and `totals`; historical odds are a separate historical endpoint. [Official docs](https://theoddsapi.com/docs/)
- StatsBomb Open Data distributes competitions, matches, events, and lineups as JSON and requires source attribution for published work. [Official repository](https://github.com/statsbomb/open-data)
- Open-Meteo documents its `/v1/forecast` endpoint with WGS84 coordinates and hourly weather variables. The adapter records forecast data separately from actual post-match conditions to prevent temporal leakage. [Official docs](https://open-meteo.com/en/docs)
- YouTube search and X search remain optional, credentialed connectors. Their API responses are treated as source evidence, not probability input; only corroborated factual events can change availability features. [YouTube docs](https://developers.google.com/youtube/v3/docs/search/list), [X docs](https://docs.x.com/x-api/posts/search/integrate/build-a-query)

Do not use betPawa as a data source. The only betPawa-related feature is a manual decimal-odds entry field.
