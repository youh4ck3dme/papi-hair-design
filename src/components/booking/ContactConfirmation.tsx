import { User, Mail, Phone, PenLine, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { StepHeader } from "./BookingUI";
import { ServiceRow, EmployeeRow } from "./types";

interface ContactConfirmationProps {
    formData: any;
    setFormData: (data: any) => void;
    contactErrors: Record<string, string>;
    handleCheckAll: () => void;
    handleConsentChange: (field: "marketing" | "terms") => void;
    selectedService: ServiceRow | null;
    selectedEmployee: EmployeeRow | null;
    selectedFullDate: Date | null;
    selectedTime: string | null;
    dateLocale: any;
    submitting: boolean;
    handleSubmit: () => void;
}

export function ContactConfirmation({
    formData,
    setFormData,
    contactErrors,
    handleCheckAll,
    handleConsentChange,
    selectedService,
    selectedEmployee,
    selectedFullDate,
    selectedTime,
    dateLocale,
    submitting,
    handleSubmit,
}: ContactConfirmationProps) {
    const { t } = useTranslation();

    return (
        <div className="animate-fade-in pb-10 px-4" data-testid="booking-step-details">
            <StepHeader num="6" title={t("booking.step6")} />

            <div className="flex flex-col gap-4 mb-6">
                {[
                    { icon: User, placeholder: t("booking.firstName"), field: "meno" as const, type: "text" },
                    { icon: User, placeholder: t("booking.lastName"), field: "priezvisko" as const, type: "text" },
                    { icon: Mail, placeholder: t("booking.emailLabel"), field: "email" as const, type: "email" },
                ].map((input) => (
                    <div key={input.field}>
                        <div className={`flex border rounded-full overflow-hidden transition-colors border-border focus-within:border-primary`}>
                            <div className="w-12 flex items-center justify-center bg-muted text-primary">
                                <input.icon size={18} />
                            </div>
                            <input
                                type={input.type}
                                placeholder={input.placeholder}
                                className="flex-1 py-3 px-4 outline-none bg-card text-foreground placeholder:text-muted-foreground"
                                value={formData[input.field]}
                                onChange={(e) => setFormData({ ...formData, [input.field]: e.target.value })}
                            />
                        </div>
                        {contactErrors[input.field] && (
                            <p className="text-destructive text-xs mt-1 ml-4">{contactErrors[input.field]}</p>
                        )}
                    </div>
                ))}

                {/* Telefón */}
                <div className="flex border rounded-full overflow-hidden transition-colors border-border focus-within:border-primary">
                    <div className="w-12 flex items-center justify-center bg-muted text-primary">
                        <Phone size={18} />
                    </div>
                    <div className="flex items-center px-3 border-r border-border bg-card">
                        <div className="w-4 h-3 rounded-sm overflow-hidden flex flex-col border border-muted-foreground/30">
                            <div className="h-1/3 bg-white w-full" />
                            <div className="h-1/3 bg-blue-600 w-full" />
                            <div className="h-1/3 bg-red-600 w-full" />
                        </div>
                        <span className="ml-2 text-sm text-muted-foreground">+421</span>
                    </div>
                    <input
                        type="tel"
                        className="flex-1 py-3 px-4 outline-none bg-card text-foreground"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>

                {/* Poznámka */}
                <div className="flex border rounded-3xl overflow-hidden transition-colors min-h-[100px] border-border focus-within:border-primary">
                    <div className="w-12 flex items-start justify-center pt-4 bg-muted text-primary">
                        <PenLine size={18} />
                    </div>
                    <textarea
                        placeholder={t("booking.note")}
                        className="flex-1 py-3 px-4 outline-none resize-none bg-card text-foreground placeholder:text-muted-foreground"
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    />
                </div>
            </div>

            {/* Consents */}
            <div className="flex flex-col gap-4 text-sm mb-8 text-muted-foreground">
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={formData.all}
                        onChange={() => handleCheckAll()}
                        className="sr-only"
                        aria-label="Označiť všetky možnosti"
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${formData.all
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40 bg-transparent group-hover:border-primary"
                        }`}>
                        {formData.all && <Check size={14} className="text-primary-foreground dark:text-background" />}
                    </div>
                    <span className="font-medium text-foreground">{t("booking.checkAll")}</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={formData.marketing}
                        onChange={() => handleConsentChange("marketing")}
                        className="sr-only"
                        aria-label="Súhlas s marketingom"
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${formData.marketing
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40 bg-transparent group-hover:border-primary"
                        }`}>
                        {formData.marketing && <Check size={14} className="text-primary-foreground dark:text-background" />}
                    </div>
                    <div className="leading-snug">
                        {t("booking.consentMarketing")}{" "}
                        <span className="text-primary cursor-pointer hover:underline">{t("booking.consentMarketingLink")}</span>
                    </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={formData.terms}
                        onChange={() => handleConsentChange("terms")}
                        className="sr-only"
                        aria-label="Súhlas s obchodnými podmienkami"
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${formData.terms
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40 bg-transparent group-hover:border-primary"
                        }`}>
                        {formData.terms && <Check size={14} className="text-primary-foreground dark:text-background" />}
                    </div>
                    <div>
                        {t("booking.consentTerms")}
                    </div>
                </label>

                <div
                    className="text-right text-primary text-sm mt-2 cursor-pointer hover:underline"
                    onClick={() => globalThis.location.href = "/privacy"}
                >
                    {t("common.privacyPolicy")}
                </div>
            </div>

            {/* Summary */}
            {selectedService && selectedFullDate && (
                <div className="text-center text-sm font-medium mb-6 text-foreground">
                    {t("booking.yourSlot")} <strong className="text-primary">{selectedService.name_sk}</strong> {t("booking.at")} <strong className="text-primary">{selectedEmployee?.display_name}</strong>
                    {" "}{t("booking.on")} <strong className="text-primary">{format(selectedFullDate, "d. MMMM", { locale: dateLocale })}</strong> {t("booking.at")} <strong className="text-primary">{selectedTime}</strong>
                </div>
            )}

            <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full font-bold py-4 rounded-full text-lg transition-all transform active:scale-[0.98] bg-primary text-primary-foreground dark:text-background hover:bg-primary/90 shadow-lg shadow-primary/30 disabled:opacity-50"
                data-testid="booking-submit"
            >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t("booking.submitBtn")}
            </button>
        </div>
    );
}
