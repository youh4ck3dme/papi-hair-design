import { Star, Sparkles, User2 } from "lucide-react";
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
        <div className="px-4" data-testid="booking-step-category">
            {/* Step 1 */}
            <StepHeader num="1" title={t("booking.step1")} extra={
                <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border border-primary/40 text-primary bg-primary/5">
                    <Star size={11} className="fill-primary" /> 4.9
                </div>
            } />

            {/* Category Toggle */}
            <div className="relative flex gap-0 rounded-full overflow-hidden border border-border bg-muted/40 p-1">
                {(["damske", "panske"] as const).map((cat) => {
                    const isActive = category === cat;
                    const Icon = cat === "damske" ? Sparkles : User2;
                    return (
                        <button
                            key={cat}
                            onClick={() => { setCategory(cat); onCategoryChange(); }}
                            className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${isActive
                                ? "bg-primary text-primary-foreground dark:text-background shadow-md shadow-primary/25"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Icon size={14} className={isActive ? "opacity-100" : "opacity-60"} />
                            {cat === "damske" ? t("booking.catWomen") : t("booking.catMen")}
                        </button>
                    );
                })}
            </div>

            {/* Subcategory chips */}
            {subcategories.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                    {subcategories.map((sub) => (
                        <button
                            key={sub}
                            onClick={() => { setSubcategory(sub); setSelectedServiceId(null); }}
                            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${subcategory === sub
                                ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                                : "border-border/60 text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground"
                                }`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
            )}

            {/* Step 2: Service picker */}
            {(subcategory || subcategories.length === 0) && filteredServices.length > 0 && (
                <div className="animate-fade-in">
                    <StepHeader num="2" title={t("booking.step2")} />
                    <div className="flex flex-col gap-3">
                        {filteredServices.map((srv) => {
                            const isSelected = selectedServiceId === srv.id;
                            return (
                                <button
                                    type="button"
                                    key={srv.id}
                                    onClick={() => setSelectedServiceId(srv.id)}
                                    className={`w-full text-left border rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 group ${isSelected
                                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                                        : "border-border/70 bg-card hover:border-primary/40 hover:shadow-sm"
                                        }`}
                                >
                                    <RadioIcon selected={isSelected} />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className={`font-semibold text-sm transition-colors ${isSelected ? "text-primary" : "text-foreground group-hover:text-foreground"}`}>
                                            {srv.name_sk}
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-0.5">
                                            {srv.duration_minutes} min
                                        </span>
                                    </div>
                                    {srv.price != null && (
                                        <div className={`flex-shrink-0 font-bold text-sm px-3 py-1 rounded-full transition-all ${isSelected ? "bg-primary text-primary-foreground dark:text-background" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>
                                            {srv.price} €
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
