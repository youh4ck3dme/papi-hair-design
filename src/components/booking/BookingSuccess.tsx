import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { GoldText } from "./BookingUI";
import { BookingResult, ServiceRow, EmployeeRow } from "./types";

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

    return (
        <div className="min-h-screen bg-background" data-testid="booking-success">
            <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between bg-background/90 border-b border-border backdrop-blur-sm">
                <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-widest uppercase font-serif text-foreground">
                        PAPI <GoldText>HAIR</GoldText> DESIGN
                    </span>
                </div>
            </header>
            <div className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{t("booking.confirmTitle")}</h2>
                <p className="text-muted-foreground text-sm">
                    {t("booking.confirmDesc")}
                </p>
                <div className="rounded-2xl border border-border bg-card p-4 text-left space-y-2 text-sm">
                    <p><strong className="text-foreground">{t("booking.confirmService")}</strong> <span className="text-muted-foreground">{selectedService?.name_sk}</span></p>
                    <p><strong className="text-foreground">{t("booking.confirmEmployee")}</strong> <span className="text-muted-foreground">{selectedEmployee?.display_name}</span></p>
                    <p><strong className="text-foreground">{t("booking.confirmDate")}</strong> <span className="text-muted-foreground">{selectedFullDate && format(selectedFullDate, "d. MMMM yyyy", { locale: dateLocale })}</span></p>
                    <p><strong className="text-foreground">{t("booking.confirmTime")}</strong> <span className="text-muted-foreground">{selectedTime}</span></p>
                </div>
                <button
                    onClick={() => {
                        if (bookingResult.claim_token) {
                            sessionStorage.setItem("claim_token", bookingResult.claim_token);
                            globalThis.location.href = `/auth?mode=register&email=${encodeURIComponent(bookingResult.customer_email || "")}&name=${encodeURIComponent(bookingResult.customer_name || "")}`;
                        }
                    }}
                    className="w-full font-bold py-4 rounded-full text-lg bg-primary text-primary-foreground dark:text-background hover:bg-primary/90 transition-all"
                >
                    {t("booking.confirmRegisterBtn")}
                </button>
                <button
                    onClick={() => globalThis.location.reload()}
                    className="text-sm text-primary hover:underline"
                >
                    {t("booking.newBooking")}
                </button>
            </div>
        </div>
    );
}
