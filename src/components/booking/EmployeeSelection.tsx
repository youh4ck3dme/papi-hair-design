import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StepHeader } from "./BookingUI";
import { EmployeeRow } from "./types";
import { resolveEmployeePhotoUrl } from "@/lib/employeePhoto";

interface EmployeeSelectionProps {
  employees: EmployeeRow[];
  isLoading?: boolean;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
}

const PLACEHOLDER_AVATAR_SRC = "/placeholder.svg";

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
                    if (event.currentTarget.getAttribute("src") === PLACEHOLDER_AVATAR_SRC) return;
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
      )}
    </div>
  );
}
