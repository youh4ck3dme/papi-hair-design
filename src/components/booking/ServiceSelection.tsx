import { useState } from "react";
import { Sparkles, User2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StepHeader, RadioIcon } from "./BookingUI";
import { ServiceRow } from "./types";
import type { ServiceSubcategoryOption } from "@/lib/serviceSubcategories";

interface ServiceSelectionProps {
    category: "damske" | "panske" | null;
    setCategory: (cat: "damske" | "panske") => void;
    subcategory: string | null;
    setSubcategory: (sub: string | null) => void;
    subcategoryOptions: ServiceSubcategoryOption[];
    showSubcategoryStep: boolean;
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
    subcategoryOptions,
    showSubcategoryStep,
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
        <div className="px-4 pt-2" data-testid="booking-step-category">
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
            <div className="relative flex gap-0 rounded-full border border-white/8 bg-muted/40 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                {(["damske", "panske"] as const).map((cat) => {
                    const isActive = category === cat && expandedCategory === cat;
                    const Icon = cat === "damske" ? Sparkles : User2;
                    return (
                        <button
                            key={cat}
                            data-testid={`booking-category-${cat}`}
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
                            className={`relative flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition-all duration-300 ${isActive
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 dark:text-background"
                                : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
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

            {isCategoryExpanded && showSubcategoryStep && (
                <div className="mt-7 space-y-3.5">
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                        {t("booking.subcategoryTitle")}
                    </p>
                    <div className="space-y-3">
                        {subcategoryOptions.map((option) => {
                            const isSelected = subcategory === option.key;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    data-testid={`booking-subcategory-${option.key}`}
                                    onClick={() => {
                                        setSubcategory(option.key);
                                        setSelectedServiceId(null);
                                    }}
                                    aria-pressed={isSelected}
                                    className={`w-full min-h-[54px] rounded-[28px] border px-5 py-3 text-center text-base font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${isSelected
                                        ? "border-[#C9A84C] bg-[#C9A84C] text-black shadow-[0_0_24px_rgba(201,168,76,0.35)]"
                                        : "border-white/12 bg-white/[0.02] text-white/75 hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-white"
                                        }`}
                                >
                                    <span>{option.name_sk}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Step 2: Service picker */}
            {isCategoryExpanded && (!showSubcategoryStep || subcategory != null) && filteredServices.length > 0 && (
                <div className="animate-fade-in pt-2">
                    <StepHeader num="2" title={t("booking.step2")} />
                    <div className="flex flex-col gap-3" aria-live="polite">
                        {filteredServices.map((srv) => {
                            const isSelected = selectedServiceId === srv.id;
                            return (
                                <button
                                    type="button"
                                    key={srv.id}
                                    data-testid={`booking-service-${srv.id}`}
                                    onClick={() => setSelectedServiceId(srv.id)}
                                    className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition-all duration-200 group ${isSelected
                                        ? "border-[#C9A84C] bg-black shadow-[0_0_20px_rgba(201,168,76,0.3)] ring-1 ring-[#C9A84C]/40"
                                        : "border-[#C0C0C0]/18 bg-black hover:border-[#C9A84C]/40 hover:bg-white/[0.02] hover:shadow-[0_0_10px_rgba(201,168,76,0.12)]"
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <RadioIcon selected={isSelected} />
                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <span className={`font-black text-sm uppercase tracking-wide transition-colors ${isSelected ? "text-[#C9A84C]" : "text-white group-hover:text-white"}`}>
                                                {srv.name_sk}
                                            </span>
                                            <span className="mt-1 text-xs font-medium text-white/40">
                                                {srv.duration_minutes} min
                                            </span>
                                        </div>
                                        {srv.price != null && (
                                            <div className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-black transition-all ${isSelected ? "bg-[#C9A84C] text-black" : "border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] group-hover:bg-[#C9A84C]/20"}`}>
                                                {srv.price} €
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {isCategoryExpanded && (!showSubcategoryStep || subcategory != null) && filteredServices.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground" data-testid="booking-no-services">
                    {t("booking.noServicesInSelection")}
                </p>
            )}
        </div>
    );
}
