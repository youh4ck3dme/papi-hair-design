import { useTranslation } from "react-i18next";
import { StepHeader } from "./BookingUI";
import { EmployeeRow } from "./types";

interface EmployeeSelectionProps {
  employees: EmployeeRow[];
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function EmployeeSelection({
  employees,
  selectedEmployeeId,
  setSelectedEmployeeId,
}: EmployeeSelectionProps) {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in px-4" data-testid="booking-step-employee">
      <StepHeader num="3" title={t("booking.step3")} />

      {employees.length === 0 ? (
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

            return (
              <button
                key={employee.id}
                type="button"
                onClick={() => setSelectedEmployeeId(employee.id)}
                className={`rounded-2xl border p-3 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                    : "border-border/70 bg-card hover:border-primary/50"
                }`}
                aria-pressed={isSelected}
              >
                <div className="mb-2 flex items-center gap-2.5">
                  {employee.photo_url ? (
                    <img
                      src={employee.photo_url}
                      alt={displayName}
                      className="h-10 w-10 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {initialsFromName(displayName)}
                    </div>
                  )}
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("booking.employeeRole")}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{displayName}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
