import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enGB, sk } from "date-fns/locale";
import { CalendarClock, History, Loader2, Mail, Phone, Search } from "lucide-react";
import { lookupBookingHistory, type BookingHistoryItem } from "@/integrations/firebase/lookupBookingHistory";
import { cancelCustomerBooking } from "@/integrations/firebase/cancelCustomerBooking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { toast } from "sonner";

const STATUS_VARIANTS: Record<string, string> = {
  confirmed: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  hold_created: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  expired: "bg-slate-100 text-slate-700 border-slate-200",
};

type HistoryLookupState = {
  accessToken: string | null;
  reference: string | null;
  email: string;
  phone: string;
};

type BookingHistoryLocationState = {
  bookingHistoryAccess?: {
    accessToken: string;
    reference: string;
  } | null;
} | null;

export default function BookingHistoryPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateLocale = i18n.language === "en" ? enGB : sk;
  const locationState = location.state as BookingHistoryLocationState;
  const persistedAccess = locationState?.bookingHistoryAccess ?? null;

  const [loading, setLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<BookingHistoryItem[]>([]);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeLookup, setActiveLookup] = useState<HistoryLookupState | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingHistoryItem | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    reference: "",
    email: "",
    phone: "",
  });

  const loadHistory = useCallback(async (input: {
    accessToken?: string | null;
    reference?: string | null;
    email?: string;
    phone?: string;
  }) => {
    const normalizedInput: HistoryLookupState = {
      accessToken: input.accessToken ?? null,
      reference: input.reference ?? null,
      email: input.email?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
    };
    setActiveLookup(normalizedInput);
    setLoading(true);
    try {
      const response = await lookupBookingHistory({
        access_token: normalizedInput.accessToken ?? undefined,
        reference: normalizedInput.reference ?? undefined,
        email: normalizedInput.email || undefined,
        phone: normalizedInput.phone || undefined,
      });

      setHistoryItems(response.appointments ?? []);
      setCustomerEmail(response.customer_email ?? input.email ?? null);
      setCustomerPhone(response.customer_phone ?? input.phone ?? null);
      setHistoryLoaded(true);
      return true;
    } catch {
      setHistoryItems([]);
      setHistoryLoaded(false);
      if (input.accessToken) {
        navigate("/dashboard/history", { replace: true, state: null });
      }
      toast.error(t("history.lookupError"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [navigate, t]);

  useEffect(() => {
    const accessFromQuery = searchParams.get("access");
    const referenceFromQuery = searchParams.get("ref");

    if (accessFromQuery && referenceFromQuery) {
      setManualForm((current) => ({
        ...current,
        reference: referenceFromQuery,
      }));
      navigate("/dashboard/history", {
        replace: true,
        state: {
          bookingHistoryAccess: {
            accessToken: accessFromQuery,
            reference: referenceFromQuery,
          },
        },
      });
      loadHistory({ accessToken: accessFromQuery, reference: referenceFromQuery });
      return;
    }

    if (persistedAccess?.accessToken && persistedAccess.reference) {
      setManualForm((current) => ({
        ...current,
        reference: persistedAccess.reference,
      }));
      loadHistory({
        accessToken: persistedAccess.accessToken,
        reference: persistedAccess.reference,
      });
    }
  }, [loadHistory, navigate, persistedAccess, searchParams]);

  const handleManualSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = await loadHistory({
      reference: manualForm.reference.trim(),
      email: manualForm.email.trim(),
      phone: manualForm.phone.trim(),
    });

    if (ok) {
      navigate("/dashboard/history", { replace: true, state: null });
    }
  }, [loadHistory, manualForm, navigate]);

  const historySummary = useMemo(() => {
    if (!historyItems.length) return null;
    return {
      upcoming: historyItems.filter((item) => item.start_at && new Date(item.start_at) >= new Date()).length,
      total: historyItems.length,
    };
  }, [historyItems]);

  const canCancelBooking = useCallback((item: BookingHistoryItem) => {
    const status = item.status ?? "pending";
    if (status === "cancelled" || status === "completed" || status === "expired" || status === "no_show") {
      return false;
    }

    if (!item.start_at) {
      return false;
    }

    const startMs = new Date(item.start_at).getTime();
    return Number.isFinite(startMs) && startMs > Date.now();
  }, []);

  const handleCancelBooking = useCallback(async () => {
    if (!cancelTarget || !activeLookup) {
      return;
    }

    setCancellingId(cancelTarget.id);
    try {
      await cancelCustomerBooking({
        appointment_id: cancelTarget.id,
        access_token: activeLookup.accessToken ?? undefined,
        reference: activeLookup.reference ?? undefined,
        email: activeLookup.email || undefined,
        phone: activeLookup.phone || undefined,
      });

      toast.success(t("history.cancelSuccess"));
      setCancelTarget(null);

      await loadHistory({
        accessToken: activeLookup.accessToken,
        reference: activeLookup.reference,
        email: activeLookup.email,
        phone: activeLookup.phone,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("history.cancelError"));
    } finally {
      setCancellingId(null);
    }
  }, [activeLookup, cancelTarget, loadHistory]);

  let historyContent: ReactNode;
  if (loading) {
    historyContent = (
      <div className="flex min-h-56 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  } else if (historyLoaded && historyItems.length === 0) {
    historyContent = (
      <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
        <p className="text-sm text-muted-foreground">{t("history.empty")}</p>
      </div>
    );
  } else if (historyItems.length > 0) {
    historyContent = (
      <div className="space-y-3">
        {historyItems.map((item) => {
          const statusClassName = STATUS_VARIANTS[item.status ?? "pending"] ?? STATUS_VARIANTS.pending;
          const startAtLabel = item.start_at
            ? format(new Date(item.start_at), "d. MMMM yyyy · HH:mm", { locale: dateLocale })
            : "—";

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-colors hover:border-primary/25"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-semibold text-foreground">
                      {item.service_name ?? t("history.unknownService")}
                    </p>
                    {item.is_reference && (
                      <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                        {t("history.referenceBadge")}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <span>{startAtLabel}</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                    {t("history.referenceLabel")}: {item.id}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <Badge className={`border ${statusClassName}`}>
                    {t(`history.status.${item.status ?? "pending"}`)}
                  </Badge>
                  {typeof item.service_price === "number" && (
                    <span className="text-sm font-semibold text-foreground">€{item.service_price}</span>
                  )}
                  {canCancelBooking(item) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setCancelTarget(item)}
                      disabled={cancellingId === item.id}
                    >
                      {cancellingId === item.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("history.cancelButton")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    historyContent = (
      <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
        <p className="text-sm text-muted-foreground">{t("history.prompt")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary/10 via-background to-background safe-x safe-y">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-3 text-foreground">
            <LogoIcon size="sm" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase">PAPI HAIR DESIGN</span>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-primary/15 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t("history.title")}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t("history.subtitle")}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {historySummary && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("history.totalBookings")}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{historySummary.total}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("history.upcomingBookings")}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{historySummary.upcoming}</p>
                  </div>
                </div>
              )}

              {(customerEmail || customerPhone) && (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t("history.identityTitle")}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="truncate">{customerEmail ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{customerPhone ?? "—"}</span>
                    </div>
                  </div>
                </div>
              )}

              {historyContent}
            </CardContent>
          </Card>

          <Card className="border-primary/15 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Search className="h-5 w-5 text-primary" />
                {t("history.lookupTitle")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("history.lookupSubtitle")}</p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleManualSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="history-reference">
                    {t("history.referenceField")}
                  </label>
                  <Input
                    id="history-reference"
                    value={manualForm.reference}
                    onChange={(event) => setManualForm((current) => ({ ...current, reference: event.target.value }))}
                    placeholder={t("history.referencePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="history-email">
                    {t("history.emailField")}
                  </label>
                  <Input
                    id="history-email"
                    type="email"
                    value={manualForm.email}
                    onChange={(event) => setManualForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder={t("history.emailPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="history-phone">
                    {t("history.phoneField")}
                  </label>
                  <Input
                    id="history-phone"
                    value={manualForm.phone}
                    onChange={(event) => setManualForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder={t("history.phonePlaceholder")}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("history.lookupButton")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("history.cancelDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("history.cancelDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("history.cancelDialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleCancelBooking();
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={cancellingId === cancelTarget?.id}
            >
              {cancellingId === cancelTarget?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("history.cancelDialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
