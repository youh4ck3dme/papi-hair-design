const LEGACY_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const DEFAULT_FALLBACK_BUSINESS_ID = "papi-hair-design-main";

function normalizeBusinessId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const DEFAULT_BUSINESS_ID =
  normalizeBusinessId(import.meta.env.VITE_PRIMARY_BUSINESS_ID as string | undefined) ??
  DEFAULT_FALLBACK_BUSINESS_ID;

export function withBusinessIdFallbacks(primary?: string | null): string[] {
  const unique = new Set<string>();

  const add = (id: string | null | undefined) => {
    const normalized = normalizeBusinessId(id);
    if (normalized) unique.add(normalized);
  };

  add(primary);
  add(DEFAULT_BUSINESS_ID);
  add(LEGACY_BUSINESS_ID);

  return [...unique];
}

