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

function normalizePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

  useEffect(() => {
    setImageLoadErrorByEmployeeId({});
  }, [employees]);

  return (
    <div className="animate-fade-in px-4" data-testid="booking-step-employee">
      <StepHeader num="3" title={t("booking.step3")} />

      {isLoading ? (
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
      ) : employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t("booking.noEmployeeAvailable", {
            defaultValue: "Pre túto službu momentálne nie je dostupný žiadny kaderník.",
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {employees.map((employee) => {
            const isSelected = selectedEmployeeId === employee.id;
            const displayName = employee.display_name || t("booking.employeeRole");
            const photoUrl = resolveEmployeePhotoUrl(employee);
            const avatarSrc = imageLoadErrorByEmployeeId[employee.id]
              ? PLACEHOLDER_AVATAR_SRC
              : photoUrl ?? PLACEHOLDER_AVATAR_SRC;

            return (
              <button
                key={employee.id}
                type="button"
                onClick={() => setSelectedEmployeeId(employee.id)}
                className={`h-full min-h-[150px] rounded-2xl border p-3 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm shadow-primary/20 ring-1 ring-primary/30"
                    : "border-border/70 bg-card hover:border-primary/50"
                }`}
                aria-pressed={isSelected}
                data-testid={`employee-card-${employee.id}`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="h-14 w-14 rounded-full border border-border/60 object-cover"
                    loading="lazy"
                    onError={(event) => {
                      if (imageLoadErrorByEmployeeId[employee.id]) return;
                      if (event.currentTarget.getAttribute("src") === PLACEHOLDER_AVATAR_SRC) return;
                      setImageLoadErrorByEmployeeId((current) => ({ ...current, [employee.id]: true }));
                    }}
                  />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("booking.employeeRole")}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{displayName}</p>
                <p className={`mt-1 text-xs font-medium ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                  {isSelected
                    ? t("booking.selected", { defaultValue: "Vybraný" })
                    : t("booking.tapToSelect", { defaultValue: "Klikni pre výber" })}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
