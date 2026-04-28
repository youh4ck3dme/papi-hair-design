import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const indexPath = resolve("functions/src/index.ts");
const source = readFileSync(indexPath, "utf8");

const exportBlockPattern = /export\s*\{([\s\S]*?)\}\s*from\s*["'][^"']+["'];/g;
const targets = [];

for (const match of source.matchAll(exportBlockPattern)) {
  const exportNames = match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(/\s+as\s+/i)[1] ?? part.split(/\s+as\s+/i)[0])
    .map((part) => part.trim());

  for (const name of exportNames) {
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      throw new Error(`Unsupported Firebase function export name: ${name}`);
    }

    targets.push(`functions:${name}`);
  }
}

if (targets.length === 0) {
  throw new Error(`No Firebase function exports found in ${indexPath}`);
}

console.log(targets.join(","));
