import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GoldText, StepHeader, RadioIcon } from "./BookingUI";
import { ServiceRow } from "./types";

interface ServiceSelectionProps {
    category: "damske" | "panske" | null;
    setCategory: (cat: "damske" | "panske") => void;
    subcategory: string | null;
    setSubcategory: (sub: string | null) => void;
    subcategories: string[];
    filteredServices: ServiceRow[];
    selectedServiceId: string | null;
    setSelectedServiceId: (id: string | null) => void;
    onCategoryChange: () => void;
}

export function ServiceSelection({
    category,
    setCategory,
    subcategory,
    setSubcategory,
    subcategories,
    filteredServices,
    selectedServiceId,
    setSelectedServiceId,
    onCategoryChange,
}: ServiceSelectionProps) {
    const { t } = useTranslation();

    return (
        <div className="px-4">
            {/* Step 1: Kategória */}
            <StepHeader num="1" title={t("booking.step1")} extra={
                <div className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium border border-primary text-primary">
                    4.9 <Star size={14} className="fill-primary" />
                </div>
            } />

            <div className="flex flex-col gap-3" data-testid="booking-step-category">
                {(["damske", "panske"] as const).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => {
                            setCategory(cat);
                            onCategoryChange();
                        }}
                        className={`w-full py-3.5 rounded-full font-medium text-lg transition-all ${category === cat
                            ? "bg-primary text-primary-foreground dark:text-background shadow-lg shadow-primary/20"
                            : "bg-card text-muted-foreground border border-border"
                            }`}
                    >
                        {cat === "damske" ? t("booking.catWomen") : t("booking.catMen")}
                    </button>
                ))}
            </div>

            <div className="mt-6 flex flex-col gap-3">
                {subcategories.map((sub) => (
                    <button
                        key={sub}
                        onClick={() => { setSubcategory(sub); setSelectedServiceId(null); }}
                        className={`w-full py-3.5 rounded-full border transition-all duration-200 text-sm font-medium uppercase tracking-wider ${subcategory === sub
                            ? "border-primary bg-card text-primary"
                            : "border-border text-muted-foreground bg-card hover:border-muted-foreground/50"
                            }`}
                    >
                        {sub}
                    </button>
                ))}
            </div>

            {/* Step 2: Služba */}
            {subcategory && filteredServices.length > 0 && (
                <div className="animate-fade-in">
                    <StepHeader num="2" title={t("booking.step2")} />
                    <div className="flex flex-col gap-3">
                        {filteredServices.map((srv) => (
                            <button
                                type="button"
                                key={srv.id}
                                onClick={() => setSelectedServiceId(srv.id)}
                                className={`w-full text-left border rounded-[2rem] p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 ${selectedServiceId === srv.id
                                    ? "border-primary bg-card"
                                    : "border-border bg-card"
                                    }`}
                            >
                                <RadioIcon selected={selectedServiceId === srv.id} />
                                <div className="flex flex-col flex-1">
                                    <span className="font-bold text-sm text-foreground">{srv.name_sk}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {srv.duration_minutes} min
                                        {srv.price != null && (
                                            <> – <GoldText className="font-medium">{srv.price} €</GoldText></>
                                        )}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
