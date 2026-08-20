# Security policy

## Scope

This application processes provider credentials, private bankroll settings, source provenance, and reproducible model inputs. It must not place bets, access bookmaker accounts, or expose provider tokens to the browser.

## Required controls

- Store all secrets in environment configuration; never in source, Git history, browser variables, logs or traces.
- Use FastAPI as the only public server-side provider boundary.
- Enable Supabase RLS on every table in the `public` schema. Private user records must use an ownership predicate with both `USING` and `WITH CHECK` for mutable rows.
- Treat future information in a historical feature as a critical data-integrity and model-security failure.
- Validate manual decimal-odds inputs, API request payloads and provider responses.
- Do not fetch, scrape, automate, or submit wagers to betPawa or any bookmaker.
- Keep public endpoints rate-limited and restrict CORS to configured origins.

## Reporting

Do not put security vulnerabilities or credentials in public issues. Report privately to the repository owner with affected component, reproduction conditions, and redacted evidence.

