import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

for (const file of ["app.js", "sw.js", "netlify/functions/jobs.js", "netlify/functions/alerts.js", "netlify/functions/location.js", "netlify/functions/auth.js"]) {
  new vm.Script(await read(file), { filename: file });
}

const manifest = JSON.parse(await read("manifest.json"));
if (manifest.name !== "JOB RADER HILLARY.21") throw new Error("Manifest name must match JOB RADER HILLARY.21.");
if (manifest.display !== "standalone") throw new Error("Manifest must install as a standalone app.");
if (!manifest.icons?.length) throw new Error("Manifest must include install icons.");

const index = await read("index.html");
for (const token of ["installButton", "languageSelect", "themeSelect", "clearPrivateButton"]) {
  if (!index.includes(token)) throw new Error(`Missing required UI token: ${token}`);
}

const androidBuild = await read("android/app/build.gradle");
for (const token of ["compileSdk 35", "targetSdk 35", "JavaVersion.VERSION_17"]) {
  if (!androidBuild.includes(token)) throw new Error(`Android store config missing ${token}`);
}

const androidManifest = await read("android/app/src/main/AndroidManifest.xml");
if (!androidManifest.includes("ACCESS_FINE_LOCATION")) throw new Error("Android location permission must be declared for user-requested address lookup.");

const iosInfo = await read("ios/App/Info.plist");
if (!iosInfo.includes("NSLocationWhenInUseUsageDescription")) throw new Error("iOS foreground location usage description is required.");

const privacyManifest = await read("ios/App/PrivacyInfo.xcprivacy");
for (const token of ["NSPrivacyTracking", "NSPrivacyAccessedAPICategoryFileTimestamp", "NSPrivacyAccessedAPICategoryUserDefaults"]) {
  if (!privacyManifest.includes(token)) throw new Error(`Apple privacy manifest missing ${token}`);
}

const authRoute = await read("netlify/functions/auth.js");
if (!authRoute.includes("loginWithApple")) throw new Error("Auth route must support Sign in with Apple.");
if (!authRoute.includes("disabledSocialProviders")) throw new Error("Auth route must block unsupported social providers.");

console.log("Build validation passed.");
