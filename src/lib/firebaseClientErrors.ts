const BLOCKED_BY_CLIENT_FRAGMENT = "err_blocked_by_client";
const FIRESTORE_LISTEN_FRAGMENT = "firestore.googleapis.com";
const FIRESTORE_TERMINATE_FRAGMENT = "type=terminate";
const FIRESTORE_INDEX_FRAGMENT = "requires an index";
const WARN_ONCE_STORAGE_KEY = "phd.firebase.blockedClientWarningShown";

let warnedInMemory = false;

type FirebaseLikeError = {
  code?: unknown;
  message?: unknown;
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function getFirebaseErrorCode(error: unknown): string {
  const code = (error as FirebaseLikeError | undefined)?.code;
  return normalizeText(typeof code === "string" ? code : "");
}

export function getFirebaseErrorMessage(error: unknown): string {
  if (typeof error === "string") return normalizeText(error);
  const message = (error as FirebaseLikeError | undefined)?.message;
  return normalizeText(typeof message === "string" ? message : "");
}

export function isBlockedByClientError(error: unknown): boolean {
  const code = getFirebaseErrorCode(error);
  const message = getFirebaseErrorMessage(error);
  return (
    code.includes("blocked") ||
    message.includes(BLOCKED_BY_CLIENT_FRAGMENT) ||
    message.includes("blocked by client")
  );
}

export function isFirestoreTerminateRequestError(error: unknown): boolean {
  const message = getFirebaseErrorMessage(error);
  return (
    message.includes(FIRESTORE_LISTEN_FRAGMENT) &&
    message.includes("/listen/channel") &&
    message.includes(FIRESTORE_TERMINATE_FRAGMENT)
  );
}

export function isIgnorableBlockedFirestoreError(error: unknown): boolean {
  if (!isBlockedByClientError(error)) return false;
  const message = getFirebaseErrorMessage(error);
  return (
    isFirestoreTerminateRequestError(error) ||
    message.includes(FIRESTORE_LISTEN_FRAGMENT)
  );
}

export function isMissingFirestoreIndexError(error: unknown): boolean {
  const code = getFirebaseErrorCode(error);
  const message = getFirebaseErrorMessage(error);
  return (
    code === "failed-precondition" ||
    code === "firestore/failed-precondition" ||
    message.includes(FIRESTORE_INDEX_FRAGMENT)
  );
}

export function warnBlockedByClientOnce(
  notify: (message: string) => void,
  message = "Prehliadač blokuje časť Firebase požiadaviek (Shields/AdBlock). Odporúčame whitelist pre localhost.",
): boolean {
  if (warnedInMemory) return false;

  if (typeof window !== "undefined") {
    try {
      if (window.sessionStorage.getItem(WARN_ONCE_STORAGE_KEY) === "1") {
        warnedInMemory = true;
        return false;
      }
      window.sessionStorage.setItem(WARN_ONCE_STORAGE_KEY, "1");
    } catch {
      // Ignore storage access issues; in-memory guard still prevents flood.
    }
  }

  warnedInMemory = true;
  notify(message);
  return true;
}
