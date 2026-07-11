import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

const jsFiles = [
  "app.js",
  "sw.js",
  "netlify/functions/jobs.js",
  "netlify/functions/alerts.js",
  "netlify/functions/location.js",
  "netlify/functions/auth.js"
];

for (const file of jsFiles) {
  const source = await read(file);
  new vm.Script(source, { filename: file });
  if (/Thread\.sleep|runBlocking|readFileSync/.test(source)) {
    throw new Error(`${file} contains a store rejection performance pattern.`);
  }
  if (/loginWithFacebook|loginWithGoogle|FacebookAuthProvider|GoogleAuthProvider/i.test(source) && !/loginWithApple|ASAuthorization|AppleIDProvider/i.test(source)) {
    throw new Error(`${file} offers social login without Sign in with Apple.`);
  }
}

const searchableFiles = [
  ...jsFiles,
  "index.html",
  "manifest.json",
  "android/app/build.gradle",
  "android/app/src/main/AndroidManifest.xml",
  "ios/App/PrivacyInfo.xcprivacy",
  "ios/App/Info.plist"
];

for (const file of searchableFiles) {
  const source = await read(file);
  if (/Base44|Edit with Base44|demo roles/i.test(source)) {
    throw new Error(`${file} contains old builder or demo text.`);
  }
}

if (!(await read("android/app/build.gradle")).includes("targetSdk 35")) {
  throw new Error("Android target SDK must be 35.");
}

console.log("Lint checks passed.");
