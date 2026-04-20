import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StepHeader } from "./BookingUI";
import { EmployeeRow } from "./types";

interface EmployeeSelectionProps {
  employees: EmployeeRow[];
  isLoading?: boolean;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
}

type EmployeeWithProfileFallback = EmployeeRow & {
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  profile_avatar_url?: string | null;
  profile?: {
    avatar_url?: string | null;
    photo_url?: string | null;
    profile_photo_url?: string | null;
  } | null;
};

const PLACEHOLDER_AVATAR_SRC = "/placeholder.svg";
const EMPLOYEE_FALLBACK_AVATAR_BY_NAME: Record<string, string> = {
  mato: "/mato.webp",
  miska: "/miska.webp",
  papi: "/papi.webp",
};

function normalizePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmployeeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function resolveEmployeeFallbackAvatar(displayName: string | null | undefined): string | null {
  if (!displayName) return null;
  return EMPLOYEE_FALLBACK_AVATAR_BY_NAME[normalizeEmployeeName(displayName)] ?? null;
}

function resolveEmployeePhotoUrl(employee: EmployeeRow): string | null {
  const source = employee as EmployeeWithProfileFallback;
  return (
    normalizePhotoUrl(source.photo_url) ??
    normalizePhotoUrl(source.avatar_url) ??
    normalizePhotoUrl(source.profile_photo_url) ??
    normalizePhotoUrl(source.profile_avatar_url) ??
    normalizePhotoUrl(source.profile?.avatar_url) ??
    normalizePhotoUrl(source.profile?.photo_url) ??
    normalizePhotoUrl(source.profile?.profile_photo_url)
  );
}

export function EmployeeSelection({
  employees,
  isLoading = false,
  selectedEmployeeId,
  setSelectedEmployeeId,
}: EmployeeSelectionProps) {
  const { t } = useTranslation();
  const [imageLoadErrorByEmployeeId, setImageLoadErrorByEmployeeId] = useState<Record<string, boolean>>({});

  let content;
  if (isLoading) {
    content = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={t("common.loading", { defaultValue: "Načítava sa" })}>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={`employee-loading-${index}`}
            className="min-h-[150px] animate-pulse rounded-2xl border border-border/60 bg-card p-3"
            data-testid="employee-card-skeleton"
          >
            <div className="mb-3 h-14 w-14 rounded-full bg-muted" />
            <div className="h-3 w-2/3 rounded bg-muted" />
            <div className="mt-2 h-4 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  } else if (employees.length === 0) {
    content = (
      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        {t("booking.noEmployeeAvailable", {
          defaultValue: "Pre túto službu momentálne nie je dostupný žiadny kaderník.",
        })}
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {employees.map((employee) => {
          const isSelected = selectedEmployeeId === employee.id;
          const displayName = employee.display_name || t("booking.employeeRole");
          const photoUrl = resolveEmployeePhotoUrl(employee);
          const fallbackAvatarSrc = resolveEmployeeFallbackAvatar(displayName);
          let avatarSrc = photoUrl ?? fallbackAvatarSrc ?? PLACEHOLDER_AVATAR_SRC;
          if (imageLoadErrorByEmployeeId[employee.id]) {
            avatarSrc = fallbackAvatarSrc ?? PLACEHOLDER_AVATAR_SRC;
          }

          return (
            <button
              key={employee.id}
              type="button"
              onClick={() => setSelectedEmployeeId(employee.id)}
              className={`h-full min-h-[150px] rounded-2xl border p-3 flex flex-col items-center justify-center text-center transition-all duration-200 ${
                isSelected
                  ? "border-[#C9A84C] bg-black shadow-[0_0_20px_rgba(201,168,76,0.35)] ring-1 ring-[#C9A84C]/50 scale-[1.02]"
                  : "border-[#C0C0C0]/20 bg-black hover:border-[#C9A84C]/40 hover:shadow-[0_0_12px_rgba(201,168,76,0.15)]"
              }`}
              aria-pressed={isSelected}
              data-testid={`employee-card-${employee.id}`}
            >
              <img
                src={avatarSrc}
                alt={displayName}
                className="h-14 w-14 rounded-full border border-border/60 object-cover mb-3"
                loading="lazy"
                onError={(event) => {
                  if (imageLoadErrorByEmployeeId[employee.id]) return;
                  const currentSrc = event.currentTarget.getAttribute("src");
                  if (currentSrc === PLACEHOLDER_AVATAR_SRC || currentSrc === fallbackAvatarSrc) return;
                  setImageLoadErrorByEmployeeId((current) => ({ ...current, [employee.id]: true }));
                }}
              />
              <p className="line-clamp-2 text-sm font-black uppercase tracking-wide text-foreground">{displayName}</p>
              <p className={`mt-1 text-xs font-semibold ${isSelected ? "text-[#C9A84C]" : "text-white/40"}`}>
                {isSelected
                  ? t("booking.selected", { defaultValue: "Vybraný" })
                  : t("booking.tapToSelect", { defaultValue: "Klikni pre výber" })}
              </p>
            </button>
          );
        })}
      </div>
    );
  }

  useEffect(() => {
    setImageLoadErrorByEmployeeId({});
  }, [employees]);

  return (
    <div className="animate-fade-in px-4" data-testid="booking-step-employee">
      <StepHeader num="3" title={t("booking.step3")} />
      {content}
    </div>
  );
}
