# JOB RADER HILLARY.21

Installable job-tracker PWA for CV matching, current job search, resume drafting, and application tracking. The job feed is limited to the selected role/type, original publication date, workplace-radius, and remote-work filters; it does not broaden them to fill an empty feed. CV percentages describe explainable compatibility, not a statistically proven chance of being hired.

## Privacy behavior

- PDF, DOCX, and text CVs are parsed in the browser. Raw CV text and uploaded file contents remain in page memory only; they are not stored in browser storage or sent to job boards.
- CV-driven searches send extracted role terms, not the full CV. A radius search sends the entered or CV-inferred address to the Photon geocoder for location verification. The job-search backend receives the user's origin coordinates and only a coarse postcode/city for provider searches; exact street addresses are not sent to job-source queries. Exact-origin lookups are not cached or persisted.
- Clear CV + Searches removes the CV and search drafts. Optional auto-delete remains available. Saved tracker records and preferences are separate app data.
- The service worker does not persist response caches. Cloudflare and Netlify headers allow foreground geolocation only on the app's own origin; the browser-location button still requires the user's explicit permission.

## Search and matching behavior

- Original publication timestamps determine inclusion; modifications do not make old posts fresh. The strict maximum freshness is 14 days.
- A positive radius requires a verified origin and a source-reported distance or geocoded workplace. Unverifiable local workplaces are excluded. Geocoded postcode/city distances are labelled approximate; remote roles are distinct from local workplace distances.
- Supported CV role families come from explicit role/experience evidence and bounded German/English synonyms. Unrelated incidental-keyword roles are not used as fallbacks. Mandatory unmet language, licence, and qualification requirements prevent an 85%+ score.
- Sources are Arbeitnow, the Federal Employment Agency (Arbeitsagentur), and Remote OK. A failing source is disclosed; an all-source failure is reported as a failure rather than as an empty no-jobs result. The Arbeitsagentur API supports search radii up to 200 km; larger UI selections are still distance-checked, but that source may under-cover listings beyond its supported request radius.

## Local checks

```sh
npm run lint
npm test
npm run build
```

The test suite uses anonymized fixtures; it does not contain the supplied CV or screenshot.

## Local preview

Open `index.html` through a static server. PDF.js and the BSD-2-Clause Mammoth browser bundle are included locally so PDF/DOCX extraction does not require uploading CV content or loading a remote parser.

## Deployment

Cloudflare Pages serves the same-origin `/api/*` handlers through `_worker.js`; Netlify uses its function adapters. Deploy the repository root as the static publish directory so the local parser, shared job logic, and function routes are included.

## Phone and desktop install

The app is a PWA. Android can install it from Chrome, iPhone can install it from Safari with Add to Home Screen, and macOS can install it from a supported browser.

A native Android APK requires Java and an Android SDK. A native iPhone IPA or macOS desktop app requires Apple's tooling and signing on macOS.
