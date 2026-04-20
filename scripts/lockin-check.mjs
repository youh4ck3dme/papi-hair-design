#!/usr/bin/env node
/**
 * Lock-in check: ensures Node version is correct and blocks accidental Vercel lock-in
 * in this Firebase-only project.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const pkgPath = join(rootDir, "package.json");
const raw = readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(raw);
const engines = pkg.engines?.node;
if (!engines) {
  console.log("[lockin:check] No engines.node in package.json, skip.");
  process.exit(0);
}

const current = process.version.replace(/^v/, ""); // e.g. "20.10.0"
const [cMajor, cMinor = 0] = current.split(".").map(Number);

// Support ">=18.0.0" or "18.x" style
const match = engines.match(/>=(\d+)\.(\d+)/) || engines.match(/(\d+)\.x/);
if (!match) {
  console.log("[lockin:check] engines.node format not parsed:", engines);
  process.exit(0);
}
const [, minMajor, minMinor = 0] = match.map(Number);

const ok = cMajor > minMajor || (cMajor === minMajor && cMinor >= minMinor);
if (!ok) {
  console.error(`[lockin:check] Node ${process.version} does not satisfy ${engines} (required: >= ${minMajor}.${minMinor})`);
  process.exit(1);
}

const errors = [];

if (existsSync(join(rootDir, "vercel.json"))) {
  errors.push("vercel.json must not exist in the Firebase source-of-truth project.");
}

for (const section of ["dependencies", "devDependencies"]) {
  const deps = pkg[section] ?? {};
  for (const name of Object.keys(deps)) {
    if (name === "@vercel/speed-insights" || name.startsWith("@vercel/")) {
      errors.push(`Forbidden ${section} entry detected: ${name}`);
    }
  }
}

const blockedPatterns = [
  /@vercel\//,
  /_vercel\//,
  /\bSpeedInsights\b/,
  /\bVITE_VERCEL\b/,
  /\.vercel\.app\b/,
];

const scanRoots = ["src", "public", "scripts", "functions", "."];
const scanExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".html"]);
const skipDirs = new Set([
  ".git",
  ".firebase",
  ".venv",
  "node_modules",
  "dist",
  "coverage",
  "test-results",
  "emulator-data",
]);
const skipFiles = new Set([
  "scripts\\lockin-check.mjs",
]);
const scanned = new Set();

function scanPath(targetPath) {
  if (!existsSync(targetPath)) return;
  const normalized = relative(rootDir, targetPath) || ".";
  if (scanned.has(normalized)) return;
  scanned.add(normalized);

  const stat = statSync(targetPath);
  if (stat.isDirectory()) {
    const dirName = normalized.split("\\").at(-1) ?? normalized;
    if (skipDirs.has(dirName)) return;
    for (const entry of readdirSync(targetPath)) {
      scanPath(join(targetPath, entry));
    }
    return;
  }

  const extension = normalized.includes(".")
    ? normalized.slice(normalized.lastIndexOf("."))
    : "";
  if (!scanExtensions.has(extension)) return;
  if (skipFiles.has(normalized)) return;

  const content = readFileSync(targetPath, "utf8");
  for (const pattern of blockedPatterns) {
    if (pattern.test(content)) {
      errors.push(`Forbidden Vercel reference ${pattern} found in ${normalized}`);
    }
  }
}

for (const root of scanRoots) {
  scanPath(join(rootDir, root));
}

if (errors.length > 0) {
  console.error("[lockin:check] Blocking deploy because Firebase must remain the only platform target.");
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log(`[lockin:check] Node ${process.version} OK (${engines})`);
console.log("[lockin:check] Firebase-only guard OK");
