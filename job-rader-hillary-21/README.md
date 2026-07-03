# JOB RADER HILLARY.21

Clean installable job-tracker PWA for CV matching, job search, resume drafting, and application tracking.

## Privacy behavior

- CV text is kept in page memory only.
- CV matching can auto-delete the CV immediately after use.
- Search drafts are not persisted.
- The service worker deletes caches and fetches with `no-store`.
- Netlify headers disable browser caching for app files.

## Local preview

Open `index.html` directly or serve this folder with any static server.

## Netlify

Deploy this folder as the publish directory:

```powershell
netlify deploy --prod --dir .
```

## Phone and desktop install

The app is a PWA. Android can install it from Chrome, iPhone can install it from Safari with Add to Home Screen, and macOS can install it from a supported browser.

A native Android APK requires Java and an Android SDK. A native iPhone IPA or macOS desktop app requires Apple's tooling and signing on macOS.
