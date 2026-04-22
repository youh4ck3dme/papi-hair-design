import { useEffect, useMemo, useState } from "react";
import { Check, CalendarCheck2, Clock4, Loader2, Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { BookingResult, ServiceRow } from "./types";
import {
    buildBookingCalendarExport,
    buildBookingIcsDownloadUrl,
    buildBookingIcsFilename,
    buildGoogleCalendarUrl,
    buildIcsContent,
} from "@/lib/calendarExport";
import { PublicStickyHeader } from "@/components/public/PublicStickyHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
    resolveBookingAccountState,
    type BookingAccountState,
} from "@/integrations/firebase/resolveBookingAccountState";
import { buildTextDataUrl } from "@/lib/browserDataUrl";

interface BookingSuccessProps {
    bookingResult: BookingResult;
    selectedService: ServiceRow | null;
    selectedFullDate: Date | null;
    selectedTime: string | null;
    dateLocale: any;
}

export function BookingSuccess({
    bookingResult,
    selectedService,
    selectedFullDate,
    selectedTime,
    dateLocale,
}: BookingSuccessProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [accountState, setAccountState] = useState<BookingAccountState | null>(null);
    const [accountStateLoading, setAccountStateLoading] = useState(false);

    const accountHint = useMemo<BookingAccountState | null>(() => {
        if (accountState) return accountState;
        if (bookingResult.customer_record_status === "existing") return "known_customer";
        if (bookingResult.customer_record_status === "created") return "new_customer";
        return null;
    }, [accountState, bookingResult.customer_record_status]);

    useEffect(() => {
        if (user || !bookingResult.claim_token) {
            setAccountState(null);
            setAccountStateLoading(false);
            return;
        }

        let active = true;
        setAccountStateLoading(true);
        void resolveBookingAccountState({ claim_token: bookingResult.claim_token })
            .then((result) => {
                if (!active || result.error || !result.state) return;
                setAccountState(result.state);
            })
            .finally(() => {
                if (active) {
                    setAccountStateLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [bookingResult.claim_token, user]);

    const historyHref = bookingResult.history_access_token && bookingResult.history_reference
        ? `/dashboard/history?access=${encodeURIComponent(bookingResult.history_access_token)}&ref=${encodeURIComponent(bookingResult.history_reference)}`
        : "/dashboard/history";
    const authQuery = new URLSearchParams();
    if (bookingResult.claim_token) authQuery.set("claim", bookingResult.claim_token);
    if (bookingResult.customer_email) authQuery.set("email", bookingResult.customer_email);
    if (bookingResult.customer_name) authQuery.set("name", bookingResult.customer_name);
    if (accountHint) authQuery.set("account", accountHint);

    const registerHref = `/auth?mode=register&${authQuery.toString()}`;
    const loginHref = `/auth?mode=login&${authQuery.toString()}`;
    const forgotHref = `/auth?mode=forgot&email=${encodeURIComponent(bookingResult.customer_email ?? "")}&account=existing_account`;
    const appointmentStart = selectedFullDate && selectedTime
        ? new Date(
            selectedFullDate.getFullYear(),
            selectedFullDate.getMonth(),
            selectedFullDate.getDate(),
            Number(selectedTime.split(":")[0] ?? 0),
            Number(selectedTime.split(":")[1] ?? 0),
        )
        : null;
    const appointmentEnd = appointmentStart && selectedService
        ? new Date(appointmentStart.getTime() + (selectedService.duration_minutes + (selectedService.buffer_minutes ?? 0)) * 60 * 1000)
        : null;
    const calendarExport = appointmentStart && appointmentEnd
        ? buildBookingCalendarExport({
            appointmentId: bookingResult.appointment_id,
            businessName: "PAPI Hair Design",
            serviceName: selectedService?.name_sk ?? t("booking.confirmTitle"),
            location: t("index.address"),
            start: appointmentStart,
            end: appointmentEnd,
        })
        : null;

    const googleCalendarHref = calendarExport
        ? buildGoogleCalendarUrl(calendarExport)
        : null;
    const icsDownloadHref = bookingResult.history_access_token && bookingResult.history_reference
        ? buildBookingIcsDownloadUrl(bookingResult.history_reference, bookingResult.history_access_token)
        : calendarExport
            ? buildTextDataUrl(buildIcsContent(calendarExport), "text/calendar;charset=utf-8")
            : null;
    const icsDownloadName = buildBookingIcsFilename(selectedService?.name_sk);

    return (
        <div className="min-h-screen bg-background" data-testid="booking-success">
            <PublicStickyHeader currentOverride="services" />

            <div className="max-w-md mx-auto px-5 py-12 text-center space-y-6">
                {/* Animated checkmark */}
                <div className="flex items-center justify-center">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-30" />
                        <div className="relative w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center">
                            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                                <Check className="w-6 h-6 text-primary-foreground dark:text-background" strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <h2 className="text-2xl font-bold text-foreground">{t("booking.confirmTitle")}</h2>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                        {t("booking.confirmDesc")}
                    </p>
                </div>

                {/* Summary card */}
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-4 text-left space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <CalendarCheck2 size={13} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t("booking.confirmBrand")}</p>
                            <p className="font-semibold text-foreground">PAPI HAIR DESIGN</p>
                        </div>
                    </div>
                    {selectedService && (
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <Scissors size={13} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t("booking.confirmService")}</p>
                                <p className="font-semibold text-foreground">{selectedService.name_sk}</p>
                            </div>
                        </div>
                    )}
                    {selectedFullDate && (
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <CalendarCheck2 size={13} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t("booking.confirmDate")}</p>
                                <p className="font-semibold text-foreground">{format(selectedFullDate, "d. MMMM yyyy", { locale: dateLocale })}</p>
                            </div>
                        </div>
                    )}
                    {selectedTime && (
                        <div className="flex items-center gap-3 text-sm border-t border-primary/10 pt-3">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <Clock4 size={13} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t("booking.confirmTime")}</p>
                                <p className="font-bold text-primary text-base">{selectedTime}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3 pt-2">
                    {!user && bookingResult.claim_token && (
                        <div className="rounded-2xl border border-primary/18 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 p-4 text-left">
                            {accountStateLoading ? (
                                <div className="flex min-h-[96px] items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-base font-semibold text-foreground">
                                        {accountHint === "existing_account"
                                            ? t("booking.accountExistingTitle")
                                            : accountHint === "known_customer"
                                                ? t("booking.accountKnownTitle")
                                                : t("booking.accountNewTitle")}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {accountHint === "existing_account"
                                            ? t("booking.accountExistingDesc")
                                            : accountHint === "known_customer"
                                                ? t("booking.accountKnownDesc")
                                                : t("booking.accountNewDesc")}
                                    </p>

                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                        <a
                                            href={accountHint === "existing_account" ? loginHref : registerHref}
                                            className="premium-action-btn inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm tracking-wide transition-all active:scale-[0.98]"
                                        >
                                            {accountHint === "existing_account"
                                                ? t("booking.accountExistingPrimary")
                                                : t("booking.accountCreatePrimary")}
                                        </a>
                                        <a
                                            href={accountHint === "existing_account" ? forgotHref : loginHref}
                                            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                                        >
                                            {accountHint === "existing_account"
                                                ? t("booking.accountExistingSecondary")
                                                : t("booking.accountCreateSecondary")}
                                        </a>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {googleCalendarHref && (
                        <div className="grid gap-2 sm:grid-cols-2">
                            <a
                                href={googleCalendarHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                            >
                                {t("booking.addToGoogleCalendar")}
                            </a>
                            <a
                                href={icsDownloadHref ?? "#"}
                                download={
                                    bookingResult.history_access_token && bookingResult.history_reference
                                        ? undefined
                                        : icsDownloadName
                                }
                                rel="noopener noreferrer"
                                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                            >
                                {t("booking.downloadIcs")}
                            </a>
                        </div>
                    )}
                    <a
                        href={historyHref}
                        className="premium-action-btn flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm tracking-wide transition-all active:scale-[0.98]"
                    >
                        {t("booking.historyCta")}
                    </a>
                    <button
                        onClick={() => globalThis.location.reload()}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                    >
                        {t("booking.newBooking")}
                    </button>
                </div>
            </div>
        </div>
    );
}
