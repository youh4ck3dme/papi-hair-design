import { useTranslation } from "react-i18next";
import { StepHeader } from "./BookingUI";
import { EmployeeRow } from "./types";

interface EmployeeSelectionProps {
    filteredEmployees: EmployeeRow[];
    selectedWorkerId: string | null;
    setSelectedWorkerId: (id: string | null) => void;
    employeePhotos: Record<string, string>;
    onEmployeeSelect: () => void;
}

export function EmployeeSelection({
    filteredEmployees,
    selectedWorkerId,
    setSelectedWorkerId,
    employeePhotos,
    onEmployeeSelect,
}: EmployeeSelectionProps) {
    const { t } = useTranslation();

    const resolvePhotoSrc = (employee: EmployeeRow): string => {
        if (employee.photo_url) return employee.photo_url;
        const keyById = employeePhotos[employee.id];
        if (keyById) return keyById;
        const normalizedName = employee.display_name.trim().toLowerCase();
        return employeePhotos[normalizedName] ?? "";
    };

    return (
        <div className="animate-fade-in px-4" data-testid="booking-step-employee">
            <StepHeader num="3" title={t("booking.step3")} />
            <div className="flex flex-col gap-3">
                {filteredEmployees.map((w) => {
                    const isSelected = selectedWorkerId === w.id;
                    const photoSrc = resolvePhotoSrc(w);
                    return (
                        <button
                            type="button"
                            key={w.id}
                            onClick={() => {
                                setSelectedWorkerId(w.id);
                                onEmployeeSelect();
                            }}
                            className={`w-full text-left rounded-2xl overflow-hidden flex items-stretch cursor-pointer transition-all duration-300 outline-none group ${isSelected
                                ? "ring-2 ring-primary shadow-lg shadow-primary/15"
                                : "ring-1 ring-border hover:ring-primary/40 hover:shadow-md"
                                }`}
                        >
                            {/* Photo section */}
                            <div className="relative w-24 flex-shrink-0 overflow-hidden">
                                {photoSrc ? (
                                    <img
                                        src={photoSrc}
                                        alt={w.display_name}
                                        className="object-cover w-full h-full min-h-[88px]"
                                    />
                                ) : (
                                    <div className="w-full h-full min-h-[88px] bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                                        {w.display_name.charAt(0)}
                                    </div>
                                )}
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/40" />
                            </div>

                            {/* Info section */}
                            <div className={`flex-1 flex items-center justify-between px-5 py-4 transition-colors ${isSelected ? "bg-primary/5" : "bg-card"}`}>
                                <div>
                                    <p className={`font-bold text-base tracking-wide transition-colors ${isSelected ? "text-primary" : "text-foreground"}`}>
                                        {w.display_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t("booking.employeeRole")}</p>
                                </div>
                                {/* Selection pill */}
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${isSelected ? "border-primary scale-110" : "border-muted-foreground/30 group-hover:border-primary/50"}`}>
                                    <div className={`rounded-full bg-primary transition-all duration-200 ${isSelected ? "w-2.5 h-2.5" : "w-0 h-0"}`} />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
