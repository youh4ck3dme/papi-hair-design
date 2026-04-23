import { describe, expect, it } from "vitest";

import {
  ALLOWED_PRODUCTION_BRANCH,
  ALLOWED_PRODUCTION_FIREBASE_PROJECT,
  ALLOWED_PRODUCTION_REPOSITORY,
  validateProductionDeployContext,
} from "../../scripts/assert-production-branch.mjs";

describe("validateProductionDeployContext", () => {
  it("accepts the canonical production branch, repo, and Firebase project", () => {
    const result = validateProductionDeployContext({
      GITHUB_REF_NAME: ALLOWED_PRODUCTION_BRANCH,
      GITHUB_REPOSITORY: ALLOWED_PRODUCTION_REPOSITORY,
      GITHUB_ACTIONS: "true",
      VITE_FIREBASE_PROJECT_ID: ALLOWED_PRODUCTION_FIREBASE_PROJECT,
    });

    expect(result.errors).toEqual([]);
  });

  it("rejects deploys from a different repository", () => {
    const result = validateProductionDeployContext({
      GITHUB_REF_NAME: ALLOWED_PRODUCTION_BRANCH,
      GITHUB_REPOSITORY: "someone-else/papi-hair-design",
      GITHUB_ACTIONS: "true",
      VITE_FIREBASE_PROJECT_ID: ALLOWED_PRODUCTION_FIREBASE_PROJECT,
    });

    expect(result.errors).toContain(
      `Production deploy is locked to '${ALLOWED_PRODUCTION_REPOSITORY}'. Current repository: 'someone-else/papi-hair-design'.`
    );
  });

  it("requires an explicit GitHub repository slug in CI", () => {
    const result = validateProductionDeployContext({
      GITHUB_REF_NAME: ALLOWED_PRODUCTION_BRANCH,
      GITHUB_ACTIONS: "true",
      VITE_FIREBASE_PROJECT_ID: ALLOWED_PRODUCTION_FIREBASE_PROJECT,
    });

    expect(result.errors).toContain("Production deploy requires an explicit GitHub repository slug in CI.");
  });

  it("rejects deploys to a different Firebase project", () => {
    const result = validateProductionDeployContext({
      GITHUB_REF_NAME: ALLOWED_PRODUCTION_BRANCH,
      GITHUB_REPOSITORY: ALLOWED_PRODUCTION_REPOSITORY,
      GITHUB_ACTIONS: "true",
      VITE_FIREBASE_PROJECT_ID: "wrong-project",
    });

    expect(result.errors).toContain(
      `Production deploy is locked to Firebase project '${ALLOWED_PRODUCTION_FIREBASE_PROJECT}'. Current project: 'wrong-project'.`
    );
  });

  it("requires an explicit Firebase project id in CI", () => {
    const result = validateProductionDeployContext({
      GITHUB_REF_NAME: ALLOWED_PRODUCTION_BRANCH,
      GITHUB_REPOSITORY: ALLOWED_PRODUCTION_REPOSITORY,
      GITHUB_ACTIONS: "true",
    });

    expect(result.errors).toContain("Production deploy requires an explicit Firebase project id in CI.");
  });

  it("keeps local branch-only checks usable outside GitHub Actions", () => {
    const result = validateProductionDeployContext({
      GITHUB_REF_NAME: ALLOWED_PRODUCTION_BRANCH,
    });

    expect(result.errors).toEqual([]);
  });
});
