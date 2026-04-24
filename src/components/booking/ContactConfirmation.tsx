import { User, Mail, Phone, PenLine, Check, Loader2, CalendarCheck2, Clock4 } from "lucide-react";
import { format } from "date-fns";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { StepHeader } from "./BookingUI";
import { ServiceRow, type ContactErrors, type ContactFormData } from "./types";
import { APP_BRAND_NAME } from "@/lib/brandConfig";

interface ContactConfirmationProps {
    formData: ContactFormData;
    setFormData: React.Dispatch<React.SetStateAction<ContactFormData>>;
    contactErrors: ContactErrors;
    setContactErrors?: React.Dispatch<React.SetStateAction<ContactErrors>>;
    handleCheckAll: () => void;
    handleConsentChange: (field: "marketing" | "terms" | "gdpr") => void;
    selectedService: ServiceRow | null;
    selectedFullDate: Date | null;
    selectedTime: string | null;
    dateLocale: any;
    submitting: boolean;
    handleSubmit: () => void;
}

function InputRow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="flex border rounded-xl overflow-hidden transition-all duration-200 border-border/60 focus-within:border-primary focus-within:shadow-sm focus-within:shadow-primary/10 bg-card">
            <div className="w-11 flex items-center justify-center bg-muted/60 text-muted-foreground flex-shrink-0">
                <Icon size={16} />
            </div>
            {children}
        </div>
    );
}

function ConsentBox({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group select-none">
            <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
            <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${checked
                ? "border-primary bg-primary scale-105"
                : "border-muted-foreground/30 bg-transparent group-hover:border-primary/60"
                }`}>
                {checked && <Check size={12} className="text-primary-foreground dark:text-background" strokeWidth={3} />}
            </div>
            <div className="text-sm leading-snug text-muted-foreground">{children}</div>
        </label>
    );
}

export function ContactConfirmation({
    formData,
    setFormData,
    contactErrors,
    setContactErrors,
    handleCheckAll,
    handleConsentChange,
    selectedService,
    selectedFullDate,
    selectedTime,
    dateLocale,
    submitting,
    handleSubmit,
}: ContactConfirmationProps) {
    const { t } = useTranslation();
    const updateField = (field: keyof ContactFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (!contactErrors[field] || !setContactErrors) return;

        setContactErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    return (
        <div className="animate-fade-in pb-12 px-4" data-testid="booking-step-details">
            <StepHeader num="6" title={t("booking.step6")} />

            {/* Booking summary card */}
            {selectedService && selectedFullDate && (
                <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 space-y-2">
                    <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <CalendarCheck2 size={13} className="text-primary" />
                        </div>
                        <span className="text-muted-foreground">{t("booking.confirmBrand")}</span>
                        <span className="font-semibold text-foreground ml-auto">{APP_BRAND_NAME}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <CalendarCheck2 size={13} className="text-primary" />
                        </div>
                        <span className="text-muted-foreground">{t("booking.confirmService")}</span>
                        <span className="font-semibold text-foreground ml-auto">{selectedService.name_sk}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <Clock4 size={13} className="text-primary" />
                        </div>
                        <span className="text-muted-foreground">{format(selectedFullDate, "d. MMMM", { locale: dateLocale })}</span>
                        <span className="font-bold text-primary ml-auto">{selectedTime}</span>
                    </div>
                </div>
            )}

            {/* Contact form */}
            <div className="flex flex-col gap-3 mb-6">
                {[
                    { icon: User, placeholder: t("booking.firstName"), field: "meno" as const, type: "text" },
                    { icon: User, placeholder: t("booking.lastName"), field: "priezvisko" as const, type: "text" },
                    { icon: Mail, placeholder: t("booking.emailLabel"), field: "email" as const, type: "email" },
                ].map((input) => (
                    <div key={input.field}>
                        <InputRow icon={input.icon}>
                            <input
                                id={`booking-${input.field}`}
                                name={input.field}
                                type={input.type}
                                placeholder={input.placeholder}
                                className="flex-1 py-3 px-4 outline-none bg-card text-foreground placeholder:text-muted-foreground/60 text-sm"
                                value={formData[input.field]}
                                onChange={(e) => updateField(input.field, e.target.value)}
                                aria-label={input.placeholder}
                                aria-invalid={Boolean(contactErrors[input.field])}
                                aria-describedby={contactErrors[input.field] ? `booking-${input.field}-error` : undefined}
                                autoComplete={
                                    input.field === "meno"
                                        ? "given-name"
                                        : input.field === "priezvisko"
                                          ? "family-name"
                                          : "email"
                                }
                            />
                        </InputRow>
                        {contactErrors[input.field] && (
                            <p id={`booking-${input.field}-error`} className="mt-1 ml-3 text-sm font-medium text-destructive">
                                {contactErrors[input.field]}
                            </p>
                        )}
                    </div>
                ))}

                {/* Phone */}
                <div>
                    <InputRow icon={Phone}>
                        <div className="flex items-center px-3 border-r border-border/60 bg-muted/40">
                            <div className="w-5 h-3.5 rounded-[2px] overflow-hidden flex flex-col border border-muted-foreground/20 flex-shrink-0">
                                <div className="h-1/3 bg-white" />
                                <div className="h-1/3 bg-zinc-400" />
                                <div className="h-1/3 bg-zinc-700" />
                            </div>
                            <span className="ml-1.5 text-sm font-semibold text-muted-foreground">+421</span>
                        </div>
                        <input
                            id="booking-phone"
                            name="phone"
                            type="tel"
                            placeholder="9XX XXX XXX"
                            className="flex-1 py-3 px-4 outline-none bg-card text-foreground text-sm placeholder:text-muted-foreground/60"
                            value={formData.phone}
                            onChange={(e) => updateField("phone", e.target.value)}
                            aria-label={t("history.phoneField", { defaultValue: "Telefón" })}
                            aria-invalid={Boolean(contactErrors.phone)}
                            aria-describedby={contactErrors.phone ? "booking-phone-error" : undefined}
                            autoComplete="tel-national"
                            inputMode="tel"
                        />
                    </InputRow>
                    {contactErrors.phone && (
                        <p id="booking-phone-error" className="mt-1 ml-3 text-sm font-medium text-destructive">
                            {contactErrors.phone}
                        </p>
                    )}
                </div>

                {/* Note */}
                <div className="flex border rounded-xl overflow-hidden transition-all duration-200 border-border/60 focus-within:border-primary focus-within:shadow-sm focus-within:shadow-primary/10 bg-card min-h-[96px]">
                    <div className="w-11 flex items-start justify-center pt-3.5 bg-muted/60 text-muted-foreground flex-shrink-0">
                        <PenLine size={16} />
                    </div>
                    <textarea
                        placeholder={t("booking.note")}
                        className="flex-1 py-3 px-4 outline-none resize-none bg-card text-foreground placeholder:text-muted-foreground/60 text-sm"
                        value={formData.note}
                        onChange={(e) => updateField("note", e.target.value)}
                        aria-label={t("booking.note")}
                    />
                </div>
            </div>

            {/* Consents */}
            <div className="flex flex-col gap-4 mb-8 border-t border-border/40 pt-5">
                <ConsentBox checked={formData.all} onChange={handleCheckAll}>
                    <span className="font-semibold text-foreground">{t("booking.checkAll")}</span>
                </ConsentBox>
                <ConsentBox checked={formData.marketing} onChange={() => handleConsentChange("marketing")}>
                    {t("booking.consentMarketing")}{" "}
                    <span className="text-primary hover:underline cursor-pointer">{t("booking.consentMarketingLink")}</span>
                </ConsentBox>
                <ConsentBox checked={formData.gdpr} onChange={() => handleConsentChange("gdpr")}>
                    <Trans
                        i18nKey="booking.consentGdpr"
                        components={[
                            <Link key="privacy" to="/privacy" className="text-primary hover:underline" />,
                            <Link key="terms" to="/terms" className="text-primary hover:underline" />,
                        ]}
                    />
                </ConsentBox>
                <ConsentBox checked={formData.terms} onChange={() => handleConsentChange("terms")}>
                    {t("booking.consentTerms")}
                </ConsentBox>
                <div className="mt-1 flex items-center justify-end gap-2 text-sm">
                    <Link to="/privacy" className="text-primary/85 hover:underline">
                        {t("common.privacyPolicy")}
                    </Link>
                    <span className="text-muted-foreground/50">•</span>
                    <Link to="/terms" className="text-primary/85 hover:underline">
                        {t("common.termsAndConditions")}
                    </Link>
                </div>
            </div>

            {/* Submit */}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                data-testid="booking-submit"
                className="premium-action-btn w-full min-h-[48px] rounded-xl px-4 py-3 text-base font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className="flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                    <span>{submitting ? t("booking.submitPending") : t("booking.submitBtn")}</span>
                </span>
            </button>
            <p className="mt-3 text-center text-sm leading-6 text-muted-foreground" data-testid="booking-submit-hint">
                {submitting ? t("booking.submitPendingHint") : t("booking.submitHint")}
            </p>
        </div>
    );
}
