let runtimeIdCounter = 0;

function getRuntimeEntropy(): string {
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
  return `${normalizedPrefix}${getRuntimeEntropy()}`;
}
