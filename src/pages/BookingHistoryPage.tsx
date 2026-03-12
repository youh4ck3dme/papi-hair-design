import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enGB, sk } from "date-fns/locale";
import { CalendarClock, History, Loader2, Mail, Phone, Search } from "lucide-react";
import { lookupBookingHistory, type BookingHistoryItem } from "@/integrations/firebase/lookupBookingHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { toast } from "sonner";

const ACCESS_STORAGE_KEY = "booking_history_access_token";
const REFERENCE_STORAGE_KEY = "booking_history_reference";

const STATUS_VARIANTS: Record<string, string> = {
  confirmed: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  hold_created: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  expired: "bg-slate-100 text-slate-700 border-slate-200",
};

function readStoredAccess(): { accessToken: string | null; reference: string | null } {
  if (typeof window === "undefined") {
    return { accessToken: null, reference: null };
  }

  return {
    accessToken: window.localStorage.getItem(ACCESS_STORAGE_KEY),
    reference: window.localStorage.getItem(REFERENCE_STORAGE_KEY),
  };
}

function storeAccess(accessToken: string, reference: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_STORAGE_KEY, accessToken);
  window.localStorage.setItem(REFERENCE_STORAGE_KEY, reference);
}

function clearAccess() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_STORAGE_KEY);
  window.localStorage.removeItem(REFERENCE_STORAGE_KEY);
}

export default function BookingHistoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateLocale = i18n.language === "en" ? enGB : sk;

  const [loading, setLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<BookingHistoryItem[]>([]);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
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
    setLoading(true);
    try {
      const response = await lookupBookingHistory({
        access_token: input.accessToken ?? undefined,
        reference: input.reference ?? undefined,
        email: input.email,
        phone: input.phone,
      });

      setHistoryItems(response.appointments ?? []);
      setCustomerEmail(response.customer_email ?? input.email ?? null);
      setCustomerPhone(response.customer_phone ?? input.phone ?? null);
      setHistoryLoaded(true);
      return true;
    } catch (error) {
      if (input.accessToken) {
        clearAccess();
      }
      setHistoryItems([]);
      setHistoryLoaded(false);
      toast.error(t("history.lookupError"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const accessFromQuery = searchParams.get("access");
    const referenceFromQuery = searchParams.get("ref");

    if (accessFromQuery && referenceFromQuery) {
      storeAccess(accessFromQuery, referenceFromQuery);
      setManualForm((current) => ({
        ...current,
        reference: referenceFromQuery,
      }));
      navigate("/dashboard/history", { replace: true });
      void loadHistory({ accessToken: accessFromQuery, reference: referenceFromQuery });
      return;
    }

    const stored = readStoredAccess();
    if (stored.accessToken && stored.reference) {
      setManualForm((current) => ({
        ...current,
        reference: stored.reference ?? current.reference,
      }));
      void loadHistory({ accessToken: stored.accessToken, reference: stored.reference });
    }
  }, [loadHistory, navigate, searchParams]);

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = await loadHistory({
      reference: manualForm.reference.trim(),
      email: manualForm.email.trim(),
      phone: manualForm.phone.trim(),
    });

    if (ok) {
      clearAccess();
    }
  };

  const historySummary = useMemo(() => {
    if (!historyItems.length) return null;
    return {
      upcoming: historyItems.filter((item) => item.start_at && new Date(item.start_at) >= new Date()).length,
      total: historyItems.length,
    };
  }, [historyItems]);

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

              {loading ? (
                <div className="flex min-h-56 items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : historyLoaded && historyItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
                  <p className="text-sm text-muted-foreground">{t("history.empty")}</p>
                </div>
              ) : historyItems.length > 0 ? (
                <div className="space-y-3">
                  {historyItems.map((item) => {
                    const statusClassName = STATUS_VARIANTS[item.status ?? "pending"] ?? STATUS_VARIANTS.pending;
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
                              <span>
                                {item.start_at
                                  ? format(new Date(item.start_at), "d. MMMM yyyy · HH:mm", { locale: dateLocale })
                                  : "—"}
                              </span>
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
                  <p className="text-sm text-muted-foreground">{t("history.prompt")}</p>
                </div>
              )}
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
    </div>
  );
}
