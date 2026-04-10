import { useState } from "react";
import { Sparkles, User2 } from "lucide-react";
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
    isBusinessOpenNow: boolean;
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
    isBusinessOpenNow,
    onCategoryChange,
}: ServiceSelectionProps) {
    const { t } = useTranslation();
    const [expandedCategory, setExpandedCategory] = useState<"damske" | "panske" | null>(null);
    const isCategoryExpanded = expandedCategory === category;

    return (
        <div className="px-4" data-testid="booking-step-category">
            {/* Step 1 */}
            <StepHeader num="1" title={t("booking.step1")} extra={
                <div
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold ${isBusinessOpenNow
                        ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                        : "border-rose-500/40 text-rose-600 bg-rose-500/10"
                        }`}
                >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
                    {isBusinessOpenNow ? t("booking.statusOpen") : t("booking.statusClosed")}
                </div>
            } />

            {/* Category Toggle */}
            <div className="neon-laser-border">
            <div className="neon-inner">
            <div className="relative flex gap-0 rounded-full bg-muted/40 p-1.5">
                {(["damske", "panske"] as const).map((cat) => {
                    const isActive = category === cat && expandedCategory === cat;
                    const Icon = cat === "damske" ? Sparkles : User2;
                    return (
                        <button
                            key={cat}
                            onClick={() => {
                                if (category === cat && expandedCategory === cat) {
                                    setExpandedCategory(null);
                                    setSubcategory(null);
                                    setSelectedServiceId(null);
                                    onCategoryChange();
                                    return;
                                }
                                setCategory(cat);
                                setSubcategory(null);
                                setSelectedServiceId(null);
                                setExpandedCategory(cat);
                                onCategoryChange();
                            }}
                            aria-pressed={isActive}
                            aria-expanded={isActive}
                            className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition-all duration-300 ${isActive
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
            </div>
            </div>

            {/* Subcategory chips */}
            {isCategoryExpanded && subcategories.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                    {subcategories.map((sub) => (
                        <button
                            key={sub}
                            onClick={() => { setSubcategory(sub); setSelectedServiceId(null); }}
                            aria-pressed={subcategory === sub}
                            className={`min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition-all duration-200 ${subcategory === sub
                                ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C] shadow-sm shadow-[#C9A84C]/20"
                                : "border-[#C0C0C0]/18 text-white/50 bg-black hover:border-[#C9A84C]/40 hover:text-white"
                                }`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
            )}

            {/* Step 2: Service picker */}
            {isCategoryExpanded && (subcategory || subcategories.length === 0) && filteredServices.length > 0 && (
                <div className="animate-fade-in">
                    <StepHeader num="2" title={t("booking.step2")} />
                    <div className="flex flex-col gap-3" aria-live="polite">
                        {filteredServices.map((srv) => {
                            const isSelected = selectedServiceId === srv.id;
                            return (
                                <button
                                    type="button"
                                    key={srv.id}
                                    onClick={() => setSelectedServiceId(srv.id)}
                                    className={`w-full text-left border rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 group ${isSelected
                                        ? "border-[#C9A84C] bg-black shadow-[0_0_20px_rgba(201,168,76,0.3)] ring-1 ring-[#C9A84C]/40"
                                        : "border-[#C0C0C0]/18 bg-black hover:border-[#C9A84C]/40 hover:shadow-[0_0_10px_rgba(201,168,76,0.12)]"
                                        }`}
                                >
                                    <RadioIcon selected={isSelected} />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className={`font-black text-sm uppercase tracking-wide transition-colors ${isSelected ? "text-[#C9A84C]" : "text-white group-hover:text-white"}`}>
                                            {srv.name_sk}
                                        </span>
                                        <span className="mt-0.5 text-xs text-white/40">
                                            {srv.duration_minutes} min
                                        </span>
                                    </div>
                                    {srv.price != null && (
                                        <div className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-black transition-all ${isSelected ? "bg-[#C9A84C] text-black" : "bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 group-hover:bg-[#C9A84C]/20"}`}>
                                            {srv.price} €
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {isCategoryExpanded && (subcategory || subcategories.length === 0) && filteredServices.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground" data-testid="booking-no-services">
                    {t("booking.noServicesInSelection")}
                </p>
            )}
        </div>
    );
}
