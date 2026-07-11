import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

for (const file of ["app.js", "sw.js"]) {
  new vm.Script(read(file), { filename: file });
}

const manifest = JSON.parse(read("manifest.webmanifest"));
if (manifest.name !== "CONTROL CENTER Hillary.21") throw new Error("Manifest name must match the requested brand.");
if (manifest.display !== "standalone") throw new Error("Manifest must install as a standalone PWA.");
if (!manifest.icons?.length) throw new Error("Manifest must include app icons.");

const index = read("index.html");
const requiredDomIds = [
  "installButton",
  "view-ai",
  "aiForm",
  "importPreviewDialog",
  "ledgerJobFilter",
  "ledgerMonthFilter",
  "ledgerDateFrom",
  "ledgerDateTo",
  "exportShiftsCsv",
  "exportShiftsPdf",
  "exportShiftsDocx",
  "emailLedgerButton",
  "whatsAppLedgerButton",
  "payslipRows",
  "timeAccountJob"
];

for (const id of requiredDomIds) {
  if (!index.includes(`id="${id}"`)) throw new Error(`Missing required UI element #${id}`);
}

const app = read("app.js");
const requiredCode = [
  "student_control_center_data_v2",
  "StudentControlCenterCore",
  "linkedScholarshipId",
  "calculateBankedHours",
  "getActualBankIncomeForJobMonth",
  "shouldShowInstallButton"
];

for (const token of requiredCode) {
  if (!app.includes(token)) throw new Error(`Missing required app feature: ${token}`);
}

const androidBuild = read("android/app/build.gradle");
for (const token of ["compileSdk 35", "targetSdk 35", "JavaVersion.VERSION_17"]) {
  if (!androidBuild.includes(token)) throw new Error(`Android store config missing ${token}`);
}

const privacyManifest = read("ios/App/PrivacyInfo.xcprivacy");
for (const token of ["NSPrivacyTracking", "NSPrivacyAccessedAPICategoryFileTimestamp", "NSPrivacyAccessedAPICategoryUserDefaults"]) {
  if (!privacyManifest.includes(token)) throw new Error(`Apple privacy manifest missing ${token}`);
}

const authRoute = read("netlify/functions/auth.js");
if (!authRoute.includes("loginWithApple")) throw new Error("Auth route must support Sign in with Apple.");
if (!authRoute.includes("disabledSocialProviders")) throw new Error("Auth route must block unsupported social providers.");

console.log("Build validation passed.");
