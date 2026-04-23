const ALLOWED_PRODUCTION_BRANCH = "otvarackapril2026";

function resolveCurrentBranch() {
  const githubRefName = process.env.GITHUB_REF_NAME?.trim();
  if (githubRefName) return githubRefName;

  const head = process.env.HEAD?.trim();
  if (head?.startsWith("refs/heads/")) {
    return head.slice("refs/heads/".length);
  }

  return "";
}

const currentBranch = resolveCurrentBranch();

if (currentBranch !== ALLOWED_PRODUCTION_BRANCH) {
  console.error(
    `Production deploy is locked to '${ALLOWED_PRODUCTION_BRANCH}'. Current branch: '${currentBranch || "unknown"}'.`
  );
  process.exit(1);
}

console.log(`Production deploy branch verified: ${ALLOWED_PRODUCTION_BRANCH}`);
