# Public PWA release

## Share link

The public PWA is published at `https://arawee-mayeku-sportz-hillary.pages.dev/` after the production deployment completes.

## Install instructions for users

- **Android:** open the link in Chrome, tap the browser's `⋮` menu, select **Install app** or **Add to Home screen**, then confirm.
- **iPhone / iPad:** open the link in Safari, tap **Share**, select **Add to Home Screen**, then tap **Add**. WhatsApp's in-app browser cannot install a PWA, so use its `Open in Safari` option first.

The same instructions are accessible from the **Install app** button inside the terminal.

## Maintainer update procedure

1. From `apps/web`, run `pnpm run typecheck` and `pnpm run build`.
2. Confirm `out/index.html`, `out/manifest.webmanifest`, and `out/sw.js` exist.
3. Publish the static folder with:

   ```powershell
   pnpm dlx wrangler@latest pages deploy out --project-name=arawee-mayeku-sportz-hillary
   ```

4. Open the production link in an incognito/private browser, check the dashboard and fixture terminal, and verify Chrome displays an installation option.

## Scope of this public release

This Pages release is a frontend demo/shadow terminal. It has no live sports-data provider, remote database, user account system, bookmaker integration, or automated execution. A live release requires independently authorised API credentials, a deployed HTTPS API, a linked database with migrations applied, operational monitoring, and a fresh security review.
