type EmployeePhotoProfileSource = {
  avatar_url?: string | null;
  photo_url?: string | null;
  profile_photo_url?: string | null;
};

export type EmployeePhotoSource = {
  display_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  profile_avatar_url?: string | null;
  profile?: EmployeePhotoProfileSource | null;
};

const STATIC_EMPLOYEE_PHOTO_BY_KEY: Record<string, string> = {
  mato: "/mato.webp",
  miska: "/miska.webp",
  papi: "/papi.webp",
};

export function normalizeEmployeePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmployeeIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveStaticEmployeePhotoUrl(source: Pick<EmployeePhotoSource, "display_name" | "email">): string | null {
  const candidates = [source.display_name, source.email?.split("@")[0]];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || candidate.trim().length === 0) continue;

    const normalized = normalizeEmployeeIdentity(candidate);
    if (!normalized) continue;

    if (STATIC_EMPLOYEE_PHOTO_BY_KEY[normalized]) {
      return STATIC_EMPLOYEE_PHOTO_BY_KEY[normalized];
    }

    const tokens = normalized.split(" ");
    for (const token of tokens) {
      if (STATIC_EMPLOYEE_PHOTO_BY_KEY[token]) {
        return STATIC_EMPLOYEE_PHOTO_BY_KEY[token];
      }
    }
  }

  return null;
}

export function resolveEmployeePhotoUrl(source: EmployeePhotoSource): string | null {
  return (
    normalizeEmployeePhotoUrl(source.photo_url) ??
    normalizeEmployeePhotoUrl(source.avatar_url) ??
    normalizeEmployeePhotoUrl(source.profile_photo_url) ??
    normalizeEmployeePhotoUrl(source.profile_avatar_url) ??
    normalizeEmployeePhotoUrl(source.profile?.avatar_url) ??
    normalizeEmployeePhotoUrl(source.profile?.photo_url) ??
    normalizeEmployeePhotoUrl(source.profile?.profile_photo_url) ??
    resolveStaticEmployeePhotoUrl(source)
  );
}
