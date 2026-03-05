import { useTranslation } from "react-i18next";
import { StepHeader, RadioIcon } from "./BookingUI";
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

    return (
        <div className="animate-fade-in px-4" data-testid="booking-step-employee">
            <StepHeader num="3" title={t("booking.step3")} />
            <div className="flex flex-col gap-4">
                {filteredEmployees.map((w) => (
                    <button
                        type="button"
                        key={w.id}
                        onClick={() => {
                            setSelectedWorkerId(w.id);
                            onEmployeeSelect();
                        }}
                        className={`w-full text-left border rounded-[2rem] p-2 flex items-center gap-4 cursor-pointer transition-all duration-200 ${selectedWorkerId === w.id
                            ? "border-primary bg-card"
                            : "border-border bg-card"
                            }`}
                    >
                        <div className="pl-2"><RadioIcon selected={selectedWorkerId === w.id} /></div>
                        <div className="flex w-full h-24 rounded-2xl overflow-hidden border border-primary/30">
                            <div className="w-1/3 h-full relative">
                                <img
                                    src={employeePhotos[w.id] || w.photo_url || ""}
                                    alt={w.display_name}
                                    className="object-cover w-full h-full"
                                />
                            </div>
                            <div className="w-2/3 flex items-center justify-center bg-background dark:bg-card">
                                <span className="font-bold text-lg tracking-wide text-foreground group-hover:text-primary transition-colors">{w.display_name}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
