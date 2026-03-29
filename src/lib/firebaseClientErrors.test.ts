import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
  isBlockedByClientError,
  isFirestoreTerminateRequestError,
  isIgnorableBlockedFirestoreError,
  isMissingFirestoreIndexError,
  warnBlockedByClientOnce,
} from "./firebaseClientErrors";

describe("firebaseClientErrors", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("extracts code and message safely", () => {
    expect(getFirebaseErrorCode({ code: "permission-denied" })).toBe("permission-denied");
    expect(getFirebaseErrorMessage({ message: "Something happened" })).toBe("something happened");
    expect(getFirebaseErrorCode(null)).toBe("");
    expect(getFirebaseErrorMessage(undefined)).toBe("");
  });

  it("detects blocked-by-client errors", () => {
    const error = {
      message:
        "POST https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?TYPE=terminate net::ERR_BLOCKED_BY_CLIENT",
    };

    expect(isBlockedByClientError(error)).toBe(true);
    expect(isFirestoreTerminateRequestError(error)).toBe(true);
    expect(isIgnorableBlockedFirestoreError(error)).toBe(true);
  });

  it("detects missing-index firestore errors", () => {
    expect(isMissingFirestoreIndexError({ code: "failed-precondition" })).toBe(true);
    expect(
      isMissingFirestoreIndexError({
        message: "FirebaseError: The query requires an index. You can create it here ...",
      }),
    ).toBe(true);
    expect(isMissingFirestoreIndexError(new Error("random failure"))).toBe(false);
  });

  it("warns only once per session", () => {
    const notify = vi.fn();
    const first = warnBlockedByClientOnce(notify, "warning");
    const second = warnBlockedByClientOnce(notify, "warning");

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
