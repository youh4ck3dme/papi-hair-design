let runtimeIdCounter = 0;

function getCryptoEntropy(byteLength: number): string | null {
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    return null;
  }

  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getFallbackEntropy(): string {
  runtimeIdCounter += 1;

  const timestampPart = Date.now().toString(36);
  const performancePart =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? Math.round(performance.now() * 1000).toString(36)
      : "0";

  return `${timestampPart}-${performancePart}-${runtimeIdCounter.toString(36)}`;
}

export function createRuntimeId(prefix?: string): string {
  const normalizedPrefix = prefix ? `${prefix}_` : "";

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${normalizedPrefix}${crypto.randomUUID()}`;
  }

  const cryptoEntropy = getCryptoEntropy(16);
  if (cryptoEntropy) {
    return `${normalizedPrefix}${Date.now().toString(36)}-${cryptoEntropy}`;
  }

  return `${normalizedPrefix}${getFallbackEntropy()}`;
}
