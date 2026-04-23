import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_PRODUCTION_BRANCH = "otvarackapril2026";
export const ALLOWED_PRODUCTION_REPOSITORY = "youh4ck3dme/papi-hair-design";
export const ALLOWED_PRODUCTION_FIREBASE_PROJECT = "hairchainger-main-876665-176e8";

export function resolveCurrentBranch(env = process.env) {
  const githubRefName = env.GITHUB_REF_NAME?.trim();
  if (githubRefName) return githubRefName;

  const head = env.HEAD?.trim();
  if (head?.startsWith("refs/heads/")) {
    return head.slice("refs/heads/".length);
  }

  return "";
}

export function validateProductionDeployContext(env = process.env) {
  const errors = [];
  const currentBranch = resolveCurrentBranch(env);

  if (currentBranch !== ALLOWED_PRODUCTION_BRANCH) {
    errors.push(
      `Production deploy is locked to '${ALLOWED_PRODUCTION_BRANCH}'. Current branch: '${currentBranch || "unknown"}'.`
    );
  }

  const runningInGitHubActions = env.GITHUB_ACTIONS === "true";
  const repository = env.GITHUB_REPOSITORY?.trim() || "";
  if (runningInGitHubActions && !repository) {
    errors.push("Production deploy requires an explicit GitHub repository slug in CI.");
  } else if (repository && repository !== ALLOWED_PRODUCTION_REPOSITORY) {
    errors.push(
      `Production deploy is locked to '${ALLOWED_PRODUCTION_REPOSITORY}'. Current repository: '${repository}'.`
    );
  }

  const projectId =
    env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    env.FIREBASE_PROJECT_ID?.trim() ||
    env.GCLOUD_PROJECT?.trim() ||
    "";

  if (runningInGitHubActions && !projectId) {
    errors.push("Production deploy requires an explicit Firebase project id in CI.");
  } else if (projectId && projectId !== ALLOWED_PRODUCTION_FIREBASE_PROJECT) {
    errors.push(
      `Production deploy is locked to Firebase project '${ALLOWED_PRODUCTION_FIREBASE_PROJECT}'. Current project: '${projectId}'.`
    );
  }

  return {
    currentBranch,
    projectId,
    repository,
    errors,
  };
}

export function runProductionDeployGuard(env = process.env) {
  const { currentBranch, projectId, repository, errors } = validateProductionDeployContext(env);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log(`Production deploy branch verified: ${currentBranch}`);
  if (repository) {
    console.log(`Production repository verified: ${repository}`);
  }
  if (projectId) {
    console.log(`Production Firebase project verified: ${projectId}`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : "";

if (currentFile === invokedFile) {
  runProductionDeployGuard();
}
