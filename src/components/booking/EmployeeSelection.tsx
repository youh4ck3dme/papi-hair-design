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
    <div className="animate-fade-in px-4 pt-2" data-testid="booking-step-employee">
      <StepHeader num="3" title={t("booking.step3")} />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3" aria-label={t("common.loading", { defaultValue: "Načítava sa" })}>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={`employee-loading-${index}`}
              className="min-h-[164px] animate-pulse rounded-3xl border border-border/60 bg-card/80 p-4"
              data-testid="employee-card-skeleton"
            >
              <div className="mb-3.5 h-16 w-16 rounded-full bg-muted" />
              <div className="h-3.5 w-2/3 rounded bg-muted" />
              <div className="mt-2.5 h-4 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/50 p-4 text-sm text-muted-foreground">
          {t("booking.noEmployeeAvailable", {
            defaultValue: "Pre túto službu momentálne nie je dostupný žiadny kaderník.",
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
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
                className={`group h-full min-h-[164px] rounded-3xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200 ${
                  isSelected
                    ? "border-[#C9A84C] bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.18),rgba(0,0,0,0.96)_58%)] shadow-[0_0_24px_rgba(201,168,76,0.28)] ring-1 ring-[#C9A84C]/50 scale-[1.02]"
                    : "border-[#C0C0C0]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.92))] hover:border-[#C9A84C]/40 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.94))] hover:shadow-[0_0_14px_rgba(201,168,76,0.14)]"
                }`}
                aria-pressed={isSelected}
                data-testid={`employee-card-${employee.id}`}
              >
                <img
                  src={avatarSrc}
                  alt={displayName}
                  className={`mb-3.5 h-16 w-16 rounded-full border object-cover transition-all duration-200 ${
                    isSelected ? "border-[#C9A84C]/60 shadow-[0_0_18px_rgba(201,168,76,0.2)]" : "border-border/60"
                  }`}
                  loading="lazy"
                  onError={(event) => {
                    if (imageLoadErrorByEmployeeId[employee.id]) return;
                    if (event.currentTarget.getAttribute("src") === PLACEHOLDER_AVATAR_SRC) return;
                    setImageLoadErrorByEmployeeId((current) => ({ ...current, [employee.id]: true }));
                  }}
                />
                <p className="line-clamp-2 text-sm font-black uppercase tracking-[0.16em] text-foreground">{displayName}</p>
                <p
                  className={`mt-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    isSelected ? "text-[#C9A84C]" : "text-white/45 group-hover:text-white/55"
                  }`}
                >
                  {isSelected
                    ? t("booking.selected", { defaultValue: "Vybraný" })
                    : t("booking.tapToSelect", { defaultValue: "Vybrať" })}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
