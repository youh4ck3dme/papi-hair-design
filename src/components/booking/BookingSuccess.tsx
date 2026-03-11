import { Check, CalendarCheck2, Clock4, User2, Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { GoldText } from "./BookingUI";
import { BookingResult, ServiceRow, EmployeeRow } from "./types";
import { useAuth } from "@/contexts/AuthContext";

interface BookingSuccessProps {
    bookingResult: BookingResult;
    selectedService: ServiceRow | null;
    selectedEmployee: EmployeeRow | null;
    selectedFullDate: Date | null;
    selectedTime: string | null;
    dateLocale: any;
}

export function BookingSuccess({
    bookingResult,
    selectedService,
    selectedEmployee,
    selectedFullDate,
    selectedTime,
    dateLocale,
}: BookingSuccessProps) {
    const { t } = useTranslation();
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background" data-testid="booking-success">
            {/* Header */}
            <header className="sticky top-0 z-50 flex flex-col bg-background/95 border-b border-border/60 backdrop-blur-md">
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
                <div className="flex items-center gap-2.5 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
                        <Scissors size={15} className="text-primary rotate-[-45deg]" />
                    </div>
                    <span className="text-[15px] font-bold tracking-widest uppercase font-serif">
                        PAPI <GoldText>HAIR</GoldText> DESIGN
                    </span>
                </div>
            </header>

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
                    {selectedService && (
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <Scissors size={13} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("booking.confirmService")}</p>
                                <p className="font-semibold text-foreground">{selectedService.name_sk}</p>
                            </div>
                        </div>
                    )}
                    {selectedEmployee && (
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <User2 size={13} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("booking.confirmEmployee")}</p>
                                <p className="font-semibold text-foreground">{selectedEmployee.display_name}</p>
                            </div>
                        </div>
                    )}
                    {selectedFullDate && (
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <CalendarCheck2 size={13} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("booking.confirmDate")}</p>
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
                                <p className="text-xs text-muted-foreground">{t("booking.confirmTime")}</p>
                                <p className="font-bold text-primary text-base">{selectedTime}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3 pt-2">
                    {!user && (
                        <button
                            onClick={() => {
                                if (bookingResult.claim_token) {
                                    sessionStorage.setItem("claim_token", bookingResult.claim_token);
                                } else {
                                    sessionStorage.removeItem("claim_token");
                                }
                                globalThis.location.assign(
                                    `/auth?mode=register&email=${encodeURIComponent(bookingResult.customer_email || "")}&name=${encodeURIComponent(bookingResult.customer_name || "")}`
                                );
                            }}
                            className="premium-action-btn w-full rounded-xl py-2.5 px-4 text-sm tracking-wide transition-all active:scale-[0.98]"
                        >
                            {t("booking.confirmRegisterBtn")}
                        </button>
                    )}
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
