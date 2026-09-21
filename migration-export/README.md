# WORK TRACKER Hillary.21 — editable source export

This ZIP contains the actual project source, not a rendered-site export.
Published version: 7. Source commit: 2710a6f878eea6f02a8631f452dd3dadd528ee04.
All tracked source files match that version; the working tree was clean.

## Included
- Complete editable source: web/, server/, db/, drizzle/, scripts/, tests/.
- Hidden source/config files: .gitignore and .openai/hosting.json.
- All package.json files and lockfiles, vendored libraries and licenses.
- Original server/owner-seed.json, unchanged. This is initial seed data, NOT a current database backup.
- Existing dist/ output copied as found; nothing was rebuilt.
- migration-export/source-history.bundle contains all available Git refs/history. Local .git administrative files and credentials are not included. To recover history separately: git clone migration-export/source-history.bundle restored-history
- Hosting metadata, environment configuration (no configured entries), and pending custom-domain/DNS configuration.
- Read-only live database table results with their completeness flags.

## IMPORTANT: current application-data export is incomplete
The deployed database has four user tables. members was exported completely (one owner); tasks and progress_entries were empty. tracker_data contains one owner row, but the Sites database reader truncates its data value. The exact returned fragment and truncation flag are preserved in database-read-results.json. Do NOT import that fragment as a full tracker record. complete-table-rows.json intentionally excludes that table.
The existing /api/data endpoint returned HTTP 401 using the available platform export authentication, so a complete current tracker record could not be retrieved. Full migration of current shifts, payroll and other tracker data still requires an authenticated app JSON backup or an owner-authorized full D1 export. Seed data must not replace those current records.
Database reads were sequential read-only requests, not a transactionally consistent database dump. Browser-only local storage and original payslip PDFs were not accessible; the app does not store original payslip PDFs in R2 (R2 is unconfigured).

## Running / migrating later
The project uses Node, esbuild, a Cloudflare Workers-compatible server, and a D1 database. Dependencies are reproducible from package-lock.json with npm ci. The build command is npm run build; it generates server/assets.generated.js temporarily and emits dist/. No dependencies were installed and no build or tests were run for this export.
Apply the existing drizzle SQL migrations only to a new target database. The server expects a DB binding and trusted oai-authenticated-user-id / oai-authenticated-user-email headers supplied by Sites. A different host needs equivalent trusted authentication integration; never accept these headers directly from untrusted clients. Owner bootstrap is implemented in server/api.js.
No application source, live site, records, roles, domain records, or deployment was edited, published, or deleted during this export.

Installed dependency folders and machine-specific caches are omitted. The exact source and lockfiles are present. SHA256SUMS.json lists every packaged file except itself.
