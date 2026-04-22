import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, "src");
const vitestEntry = path.join(repoRoot, "node_modules", "vitest", "vitest.mjs");
const cliArgs = process.argv.slice(2);
const batchSize = Number.parseInt(process.env.VITEST_BATCH_SIZE ?? "12", 10);
const maxOldSpaceMb = process.env.VITEST_MAX_OLD_SPACE_SIZE ?? "8192";

function isTestFile(fileName) {
  return /\.(test|spec)\.(ts|tsx)$/.test(fileName);
}

function collectTestFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && isTestFile(entry.name) && statSync(fullPath).size > 0) {
      files.push(path.relative(repoRoot, fullPath));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function runVitest(args, label) {
  const result = spawnSync(
    process.execPath,
    [
      `--max-old-space-size=${maxOldSpaceMb}`,
      vitestEntry,
      "run",
      "--pool=forks",
      "--maxWorkers=1",
      "--minWorkers=1",
      ...args,
    ],
    {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  if (label) {
    console.log(`[vitest-batch] ${label} passed`);
  }
}

if (cliArgs.length > 0) {
  runVitest(cliArgs, "targeted run");
  process.exit(0);
}

const allTestFiles = collectTestFiles(srcRoot);

if (allTestFiles.length === 0) {
  console.log("[vitest-batch] No test files found.");
  process.exit(0);
}

for (let index = 0; index < allTestFiles.length; index += batchSize) {
  const batch = allTestFiles.slice(index, index + batchSize);
  const batchNumber = Math.floor(index / batchSize) + 1;
  const totalBatches = Math.ceil(allTestFiles.length / batchSize);
  console.log(`[vitest-batch] Running batch ${batchNumber}/${totalBatches} (${batch.length} files)`);
  runVitest(batch, `batch ${batchNumber}/${totalBatches}`);
}

console.log(`[vitest-batch] Completed ${allTestFiles.length} test files in ${Math.ceil(allTestFiles.length / batchSize)} batches.`);
