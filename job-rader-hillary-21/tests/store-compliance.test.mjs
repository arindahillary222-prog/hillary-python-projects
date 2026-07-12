import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("android config targets Google Play SDK 35 with Java 17", async () => {
  const gradle = await read("android/app/build.gradle");
  assert.match(gradle, /compileSdk\s+35/);
  assert.match(gradle, /targetSdk\s+35/);
  assert.match(gradle, /JavaVersion\.VERSION_17/);
});

test("apple manifests include privacy and foreground location usage", async () => {
  const privacy = await read("ios/App/PrivacyInfo.xcprivacy");
  assert.match(privacy, /NSPrivacyTracking/);
  assert.match(privacy, /NSPrivacyAccessedAPICategoryFileTimestamp/);
  assert.match(privacy, /NSPrivacyAccessedAPICategoryUserDefaults/);

  const info = await read("ios/App/Info.plist");
  assert.match(info, /NSLocationWhenInUseUsageDescription/);
  assert.doesNotMatch(info, /NSLocationAlwaysAndWhenInUseUsageDescription/);
});

test("auth route includes Sign in with Apple and blocks unsupported social providers", async () => {
  const auth = await read("netlify/functions/auth.js");
  assert.match(auth, /loginWithApple/);
  assert.match(auth, /disabledSocialProviders/);
  assert.match(auth, /loginWithGoogle/);
  assert.match(auth, /loginWithFacebook/);
});

test("active manifest is installable and branded", async () => {
  const manifest = JSON.parse(await read("manifest.json"));
  assert.equal(manifest.name, "JOB RADER HILLARY.21");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
});

test("job alerts support real mail providers with clear configuration status", async () => {
  const cloudflareAlerts = await read("functions/api/alerts.js");
  assert.match(cloudflareAlerts, /cloudflare-email/);
  assert.match(cloudflareAlerts, /env\.EMAIL\.send/);
  assert.match(cloudflareAlerts, /RESEND_API_KEY/);
  assert.match(cloudflareAlerts, /ALERT_FROM_EMAIL/);
  assert.match(cloudflareAlerts, /getEmailStatus/);

  const app = await read("app.js");
  assert.doesNotMatch(app, /Netlify alert service/);
});
