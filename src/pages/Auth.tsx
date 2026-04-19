import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, functions } from "@/integrations/firebase/config";
import { db } from "@/integrations/firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { isAdminAllowlisted, normalizeEmail } from "@/lib/adminAllowlist";
import { z } from "zod";
import { useTranslation } from "react-i18next";

const PUBLIC_BOOKING_URL = "https://booking.papihairdesign.sk/booking";
const PUBLIC_BOOKING_PATH = "/booking";
const CROSS_DOMAIN_AUTH_HOST = "booking.papihairdesign.sk";
const CALENDAR_REDIRECT_EMAILS = new Set([
  "papi@papihairdesign.sk",
  "mato@papihairdesign.sk",
  "miska@papihairdesign.sk",
]);

function shouldRedirectToCalendar(email: string | null | undefined): boolean {
  return CALENDAR_REDIRECT_EMAILS.has(normalizeEmail(email));
}

async function resolvePostAuthPath(
  uid: string | undefined,
  email: string | null | undefined
): Promise<"/admin/calendar" | "/admin/my" | "/booking" | "cross-domain-booking"> {
  if (shouldRedirectToCalendar(email)) {
    return "/admin/calendar";
  }

  if (isAdminAllowlisted(email)) {
    return "/admin/calendar";
  }

  if (!uid) {
    if (typeof window !== "undefined" && normalizeEmail(window.location.hostname) === CROSS_DOMAIN_AUTH_HOST) {
      return "cross-domain-booking";
    }
    return "/booking";
  }

  const membershipsSnap = await getDocs(query(
    collection(db, "memberships"),
    where("profile_id", "==", uid),
    limit(10),
  ));

  const roles = membershipsSnap.docs
    .map((docSnap) => docSnap.data().role)
    .filter((role): role is "owner" | "admin" | "employee" | "customer" =>
      role === "owner" || role === "admin" || role === "employee" || role === "customer"
    );

  if (roles.includes("owner") || roles.includes("admin")) return "/admin/calendar";
  if (roles.includes("employee")) return "/admin/my";

  if (typeof window !== "undefined" && normalizeEmail(window.location.hostname) === CROSS_DOMAIN_AUTH_HOST) {
    return "cross-domain-booking";
  }
  return "/booking";
}

async function redirectAfterAuthWithMembership(
  navigate: ReturnType<typeof useNavigate>,
  uid: string | undefined,
  email: string | null | undefined
): Promise<void> {
  const target = await resolvePostAuthPath(uid, email);
  if (target === "cross-domain-booking") {
    window.location.assign(PUBLIC_BOOKING_URL);
    return;
  }
  navigate(target);
}

// ---------------------------------------------------------------------------
// Schemas & validation
// ---------------------------------------------------------------------------

function buildSchemas(t: (k: string) => string) {
  const loginSchema = z.object({
    email: z.string().email(t("auth.invalidEmail")),
    password: z.string().min(6, t("auth.passwordMin")),
  });
  return { loginSchema, registerSchema: loginSchema };
}

function parseZodErrors(error: z.ZodError): Record<string, string> {
  const errs: Record<string, string> = {};
  error.errors.forEach((err) => {
    const key = err.path[0];
    if (key && typeof key === "string") errs[key] = err.message;
  });
  return errs;
}

// ---------------------------------------------------------------------------
// Auth mode copy
// ---------------------------------------------------------------------------

export type AuthMode = "login" | "register" | "forgot";

// ---------------------------------------------------------------------------
// Claim booking (shared after register / Google sign-in)
// ---------------------------------------------------------------------------

async function tryClaimBooking(claimToken: string): Promise<boolean> {
  try {
    const claimBookingFn = httpsCallable(functions, "claimBooking");
    await claimBookingFn({ claim_token: claimToken });
    sessionStorage.removeItem("claim_token");
    return true;
  } catch (err) {
    console.warn("Claim booking failed:", err);
    sessionStorage.removeItem("claim_token");
    return false;
  }
}

function getFormSubmitHandler(
  mode: AuthMode,
  handleLogin: (e: React.FormEvent) => void,
  handleRegister: (e: React.FormEvent) => void,
  handleForgot: (e: React.FormEvent) => void
): (e: React.FormEvent) => void {
  if (mode === "login") return handleLogin;
  if (mode === "register") return handleRegister;
  return handleForgot;
}

// ---------------------------------------------------------------------------
// useAuthForm hook
// ---------------------------------------------------------------------------

function useAuthForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get("mode");
  const urlEmail = searchParams.get("email") ?? "";
  const claimToken = sessionStorage.getItem("claim_token") ?? "";

  const [mode, setMode] = useState<AuthMode>(
    urlMode === "register" ? "register" : "login"
  );
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: urlEmail, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem("auth_remember_me") === "true"
  );

  const setField = useCallback((key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  }, []);

  const setRememberMePersisted = useCallback((checked: boolean) => {
    setRememberMe(checked);
    if (checked) localStorage.setItem("auth_remember_me", "true");
    else localStorage.removeItem("auth_remember_me");
  }, []);

  const persistSessionPreference = useCallback((remember: boolean) => {
    if (remember) sessionStorage.removeItem("auth_session_tab_only");
    else sessionStorage.setItem("auth_session_tab_only", "true");
  }, []);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const { loginSchema } = buildSchemas(t);
      const result = loginSchema.safeParse(form);
      if (!result.success) {
        setErrors(parseZodErrors(result.error));
        return;
      }
      setErrors({});
      setLoading(true);
      try {
        const credential = await signInWithEmailAndPassword(auth, form.email, form.password);
        await redirectAfterAuthWithMembership(
          navigate,
          credential.user.uid,
          credential.user.email ?? form.email
        );
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("auth.toastLoginFail"));
      } finally {
        setLoading(false);
      }
    },
    [form, navigate, t]
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const { registerSchema } = buildSchemas(t);
      const result = registerSchema.safeParse(form);
      if (!result.success) {
        setErrors(parseZodErrors(result.error));
        return;
      }
      setErrors({});
      setLoading(true);
      try {
        const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
        const claimed = await tryClaimBooking(claimToken);
        toast.success(claimed ? t("auth.toastRegisterOkBooking") : t("auth.toastRegisterOk"));
        await redirectAfterAuthWithMembership(
          navigate,
          credential.user.uid,
          credential.user.email ?? form.email
        );
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("auth.toastRegisterFail"));
      } finally {
        setLoading(false);
      }
    },
    [form, claimToken, navigate, t]
  );

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email;

      const token = sessionStorage.getItem("claim_token");
      if (token) {
        const claimed = await tryClaimBooking(token);
        if (claimed) {
          toast.success(t("auth.toastLoginOkBooking"));
        }
      }
      await redirectAfterAuthWithMembership(navigate, result.user.uid, userEmail);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("auth.toastGoogleFail"));
    } finally {
      setLoading(false);
    }
  }, [navigate, t]);

  const handleForgot = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.email) {
        setErrors({ email: t("auth.toastEnterEmail") });
        return;
      }
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, form.email);
        toast.success(t("auth.toastResetSent"));
        setMode("login");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("auth.toastResetFail"));
      } finally {
        setLoading(false);
      }
    },
    [form.email, t]
  );

  const handleFormSubmit = getFormSubmitHandler(mode, handleLogin, handleRegister, handleForgot);

  const copy = {
    login: { title: t("auth.loginTitle"), description: t("auth.loginDesc"), submitText: t("auth.loginBtn") },
    register: { title: t("auth.registerTitle"), description: t("auth.registerDesc"), submitText: t("auth.registerBtn") },
    forgot: { title: t("auth.forgotTitle"), description: t("auth.forgotDesc"), submitText: t("auth.forgotBtn") },
  }[mode];

  return {
    mode,
    setMode,
    form,
    setField,
    errors,
    loading,
    rememberMe,
    setRememberMePersisted,
    handleFormSubmit,
    handleGoogleLogin,
    copy,
    t,
  };
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AuthModeLinks({
  mode,
  onModeChange,
  t,
}: Readonly<{
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  t: (k: string) => string;
}>) {
  if (mode === "login") {
    return (
      <>
        <button
          type="button"
          onClick={() => onModeChange("forgot")}
          className="text-primary hover:underline block w-full"
        >
          {t("auth.forgotLink")}
        </button>
        <p className="text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <button type="button" onClick={() => onModeChange("register")} className="text-primary hover:underline">
            {t("auth.registerBtn")}
          </button>
        </p>
      </>
    );
  }
  if (mode === "register") {
    return (
      <p className="text-muted-foreground">
        {t("auth.hasAccount")}{" "}
        <button type="button" onClick={() => onModeChange("login")} className="text-primary hover:underline">
          {t("auth.loginBtn")}
        </button>
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onModeChange("login")}
      className="text-primary hover:underline"
    >
      {t("auth.backToLogin")}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AuthPage() {
  const {
    mode,
    setMode,
    form,
    setField,
    errors,
    loading,
    rememberMe,
    setRememberMePersisted,
    handleFormSubmit,
    handleGoogleLogin,
    copy,
    t,
  } = useAuthForm();

  const showGoogle = mode === "login";

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-black p-4 safe-x safe-y relative overflow-x-hidden"
      data-testid="auth-page"
    >
      <div
        className="fixed top-4 right-4 z-50 flex items-center gap-1 safe-top safe-right"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md min-w-0">
        <div className="flex items-center justify-center gap-2 mb-8">
          <LogoIcon size="md" />
          <span className="text-2xl font-bold text-foreground">PAPI HAIR DESIGN</span>
        </div>

        <Card className="shadow-lg border-gold/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={form.email}
                  onChange={setField("email")}
                  disabled={loading}
                  data-testid="auth-email-input"
                />
                {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
              </div>

              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={setField("password")}
                    disabled={loading}
                  />
                  {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMePersisted(checked === true)}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                    {t("auth.rememberMe")}
                  </Label>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading} data-testid="auth-login-btn">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {copy.submitText}
              </Button>

              {showGoogle && (
                <>
                  <div className="relative my-2">
                    <span className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </span>
                    <span className="relative flex justify-center text-xs uppercase text-muted-foreground bg-card px-2">
                      {t("common.or")}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    data-testid="auth-google-btn"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                    {t("auth.googleBtn")}
                  </Button>
                </>
              )}
            </form>

            <div className="text-center text-sm space-y-2">
              <AuthModeLinks mode={mode} onModeChange={setMode} t={t} />
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 space-y-1 text-center text-sm text-muted-foreground">
          <a href="/demo" className="text-primary hover:underline block">
            {t("auth.demoLink")}
          </a>
          <span>
            {t("auth.bookingLink")}{" "}
            <a href="/booking" className="text-primary hover:underline">
              {t("auth.bookingLinkLabel")}
            </a>
          </span>
        </p>
      </div>
    </div>
  );
}
