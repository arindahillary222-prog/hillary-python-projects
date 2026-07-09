import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "README.md",
  "sw.js",
  "_headers",
  "_redirects",
  "netlify.toml"
];

for (const file of ["app.js", "sw.js"]) {
  new vm.Script(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
}

const forbidden = [
  ["Base", "44"],
  ["Hil", "lary"],
  ["SP", "END", " WI", "SE"],
  ["Malen", "go"],
  ["Per", "fekt"],
  ["Leh", "rieder"],
  ["Uga", "nda"],
  ["\\b", "F", "AU", "\\b"]
].map((parts) => new RegExp(parts.join(""), "i"));

for (const file of files) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      throw new Error(`${file} still contains forbidden public-app text matching ${pattern}`);
    }
  }
}

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
if (!/jobs:\s*\[\]/.test(app)) throw new Error("Fresh app data must start with no jobs.");
if (!/shifts:\s*\[\]/.test(app)) throw new Error("Fresh app data must start with no shifts.");
if (!/payslips:\s*\[\]/.test(app)) throw new Error("Fresh app data must start with no payslips.");
if (!/transactions:\s*\[\]/.test(app)) throw new Error("Fresh app data must start with no transactions.");
if (!/scholarships:\s*\[\]/.test(app)) throw new Error("Fresh app data must start with no scholarships.");

console.log("Lint checks passed.");
