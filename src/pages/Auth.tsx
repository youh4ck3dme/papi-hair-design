import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, functions } from "@/integrations/firebase/config";
import { db } from "@/integrations/firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { DEFAULT_BUSINESS_ID } from "@/lib/businessIds";
import { queueRegistrationWelcomeEmail } from "@/integrations/firebase/queueRegistrationWelcomeEmail";
import {
  ADMIN_CALENDAR_PATH,
  hasOwnerAdminMembershipForBusiness,
  sanitizeAdminReturnTo,
  type TenantMembership,
} from "@/lib/adminRouteSecurity";

const PUBLIC_BOOKING_PATH = "/booking";
type PostAuthPath = typeof ADMIN_CALENDAR_PATH | "/admin/my" | typeof PUBLIC_BOOKING_PATH;

async function loadMembershipsForUser(uid: string | undefined): Promise<TenantMembership[]> {
  if (!uid) {
    return [];
  }

  const membershipsSnap = await getDocs(query(
    collection(db, "memberships"),
    where("profile_id", "==", uid),
    limit(10),
  ));

  return membershipsSnap.docs.map((docSnap) => docSnap.data() as TenantMembership);
}

function resolvePostAuthPathFromMemberships(memberships: readonly TenantMembership[]): PostAuthPath {
  if (hasOwnerAdminMembershipForBusiness(memberships, DEFAULT_BUSINESS_ID)) return ADMIN_CALENDAR_PATH;

  const roles = memberships
    .map((membership) => membership.role)
    .filter((role): role is "owner" | "admin" | "employee" | "customer" =>
      role === "owner" || role === "admin" || role === "employee" || role === "customer"
    );

  if (roles.includes("employee")) return "/admin/my";

  return PUBLIC_BOOKING_PATH;
}

async function redirectAfterAuthWithMembership(
  navigate: ReturnType<typeof useNavigate>,
  uid: string | undefined,
  adminReturnTo?: string | null,
): Promise<void> {
  const memberships = await loadMembershipsForUser(uid);
  const target =
    adminReturnTo && hasOwnerAdminMembershipForBusiness(memberships, DEFAULT_BUSINESS_ID)
      ? sanitizeAdminReturnTo(adminReturnTo)
      : resolvePostAuthPathFromMemberships(memberships);
  navigate(target, { replace: true });
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

function getSubmittedFormValues(
  event: React.FormEvent<HTMLFormElement>,
  fallback: { email: string; password: string },
) {
  const formData = new FormData(event.currentTarget);
  const submittedEmail = formData.get("email");
  const submittedPassword = formData.get("password");

  const email =
    typeof submittedEmail === "string" && submittedEmail.trim().length > 0
      ? submittedEmail.trim()
      : fallback.email.trim();
  const password =
    typeof submittedPassword === "string" && submittedPassword.length > 0
      ? submittedPassword
      : fallback.password;

  return { email, password };
}

// ---------------------------------------------------------------------------
// Auth mode copy
// ---------------------------------------------------------------------------

export type AuthMode = "login" | "register" | "forgot";
type AccountHint = "existing_account" | "known_customer" | "new_customer" | null;

// ---------------------------------------------------------------------------
// Claim booking (shared after register / Google sign-in)
// ---------------------------------------------------------------------------

async function tryClaimBooking(claimToken: string): Promise<boolean> {
  if (!claimToken) {
    return false;
  }

  try {
    const claimBookingFn = httpsCallable(functions, "claimBooking");
    await claimBookingFn({ claim_token: claimToken });
    return true;
  } catch (err) {
    console.warn("Claim booking failed:", err);
    return false;
  }
}

function normalizeNonEmptyString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveFirebaseAuthCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code.replace(/^functions\//, "");
}

function isExistingAccountError(error: unknown): boolean {
  const code = resolveFirebaseAuthCode(error);
  return (
    code === "auth/email-already-in-use" ||
    code === "auth/credential-already-in-use" ||
    code === "auth/account-exists-with-different-credential"
  );
}

async function upsertOwnProfile(user: User, fullNameHint?: string | null): Promise<void> {
  const fullName = normalizeNonEmptyString(user.displayName) ?? normalizeNonEmptyString(fullNameHint) ?? null;
  await setDoc(
    doc(db, "profiles", user.uid),
    {
      email: user.email ?? null,
      full_name: fullName,
      avatar_url: user.photoURL ?? null,
      updated_at: new Date().toISOString(),
    },
    { merge: true },
  );
}

function buildClaimNotice(
  mode: AuthMode,
  accountHint: AccountHint,
  t: (key: string) => string,
) {
  if (!accountHint) return null;

  if (accountHint === "existing_account") {
    if (mode === "forgot") {
      return {
        title: t("auth.claimExistingTitle"),
        body: t("auth.claimExistingReset"),
      };
    }

    return {
      title: t("auth.claimExistingTitle"),
      body: mode === "register" ? t("auth.claimExistingRegister") : t("auth.claimExistingLogin"),
    };
  }

  if (accountHint === "known_customer") {
    return {
      title: t("auth.claimKnownTitle"),
      body: mode === "login" ? t("auth.claimKnownLogin") : t("auth.claimKnownRegister"),
    };
  }

  return {
    title: t("auth.claimNewTitle"),
    body: mode === "login" ? t("auth.claimNewLogin") : t("auth.claimNewRegister"),
  };
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

function useAuthForm({ adminMode = false }: { adminMode?: boolean } = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get("mode");
  const urlEmail = searchParams.get("email") ?? "";
  const claimToken = searchParams.get("claim")?.trim() ?? "";
  const adminReturnTo = adminMode ? sanitizeAdminReturnTo(searchParams.get("returnTo")) : null;
  const fullNameHint = searchParams.get("name")?.trim() ?? "";
  const accountHintRaw = searchParams.get("account")?.trim() ?? "";
  const accountHint: AccountHint =
    accountHintRaw === "existing_account" || accountHintRaw === "known_customer" || accountHintRaw === "new_customer"
      ? accountHintRaw
      : null;

  const [mode, setMode] = useState<AuthMode>(
    !adminMode && urlMode === "register" ? "register" : urlMode === "forgot" ? "forgot" : "login"
  );
  const [pendingAction, setPendingAction] = useState<AuthMode | "google" | null>(null);
  const [form, setForm] = useState({ email: urlEmail, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(true);
  const loading = pendingAction !== null;

  const setField = useCallback((key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  }, []);

  const setRememberMePersisted = useCallback((checked: boolean) => {
    setRememberMe(checked);
  }, []);

  const applyAuthPersistence = useCallback(async (remember: boolean) => {
    await setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence,
    );
  }, []);

  const syncProfile = useCallback(async (user: User) => {
    await upsertOwnProfile(user, fullNameHint);
  }, [fullNameHint]);

  const handleLogin = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const submittedForm = getSubmittedFormValues(e, form);
      setForm(submittedForm);

      const { loginSchema } = buildSchemas(t);
      const result = loginSchema.safeParse(submittedForm);
      if (!result.success) {
        setErrors(parseZodErrors(result.error));
        return;
      }
      setErrors({});
      setPendingAction("login");
      try {
        await applyAuthPersistence(rememberMe);
        const credential = await signInWithEmailAndPassword(auth, submittedForm.email, submittedForm.password);
        await syncProfile(credential.user);
        const claimed = await tryClaimBooking(claimToken);
        if (claimed) {
          toast.success(t("auth.toastLoginOkBooking"));
        }
        await redirectAfterAuthWithMembership(
          navigate,
          credential.user.uid,
          adminReturnTo,
        );
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("auth.toastLoginFail"));
      } finally {
        setPendingAction(null);
      }
    },
    [adminReturnTo, applyAuthPersistence, claimToken, form, navigate, rememberMe, syncProfile, t]
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const submittedForm = getSubmittedFormValues(e, form);
      setForm(submittedForm);

      const { registerSchema } = buildSchemas(t);
      const result = registerSchema.safeParse(submittedForm);
      if (!result.success) {
        setErrors(parseZodErrors(result.error));
        return;
      }
      setErrors({});
      setPendingAction("register");
      try {
        await applyAuthPersistence(rememberMe);
        const credential = auth.currentUser?.isAnonymous
          ? await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(submittedForm.email, submittedForm.password))
          : await createUserWithEmailAndPassword(auth, submittedForm.email, submittedForm.password);
        await syncProfile(credential.user);
        const claimed = await tryClaimBooking(claimToken);
        try {
          await queueRegistrationWelcomeEmail({
            business_id: DEFAULT_BUSINESS_ID,
          });
        } catch (emailError) {
          console.warn("Registration welcome email failed:", emailError);
        }
        toast.success(claimed ? t("auth.toastRegisterOkBooking") : t("auth.toastRegisterOk"));
        await redirectAfterAuthWithMembership(
          navigate,
          credential.user.uid,
          adminReturnTo,
        );
      } catch (err: unknown) {
        if (isExistingAccountError(err)) {
          setMode("login");
          setForm((current) => ({ ...current, password: "" }));
          toast.error(t("auth.toastAccountExists"));
          return;
        }
        toast.error(err instanceof Error ? err.message : t("auth.toastRegisterFail"));
      } finally {
        setPendingAction(null);
      }
    },
    [adminReturnTo, applyAuthPersistence, claimToken, form, navigate, rememberMe, syncProfile, t]
  );

  const handleGoogleLogin = useCallback(async () => {
    setPendingAction("google");
    try {
      await applyAuthPersistence(rememberMe);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      let result;
      if (auth.currentUser?.isAnonymous) {
        try {
          result = await linkWithPopup(auth.currentUser, provider);
        } catch (error) {
          if (!isExistingAccountError(error)) {
            throw error;
          }
          result = await signInWithPopup(auth, provider);
        }
      } else {
        result = await signInWithPopup(auth, provider);
      }

      await syncProfile(result.user);

      const claimed = await tryClaimBooking(claimToken);
      if (claimed) {
        toast.success(t("auth.toastLoginOkBooking"));
      }
      await redirectAfterAuthWithMembership(navigate, result.user.uid, adminReturnTo);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("auth.toastGoogleFail"));
    } finally {
      setPendingAction(null);
    }
  }, [adminReturnTo, applyAuthPersistence, claimToken, navigate, rememberMe, syncProfile, t]);

  const handleForgot = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const submittedForm = getSubmittedFormValues(e, form);
      setForm((current) => ({ ...current, email: submittedForm.email }));

      if (!submittedForm.email) {
        setErrors({ email: t("auth.toastEnterEmail") });
        return;
      }
      setPendingAction("forgot");
      try {
        await sendPasswordResetEmail(auth, submittedForm.email);
        toast.success(t("auth.toastResetSent"));
        setMode("login");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("auth.toastResetFail"));
      } finally {
        setPendingAction(null);
      }
    },
    [form, t]
  );

  const handleFormSubmit = getFormSubmitHandler(mode, handleLogin, handleRegister, handleForgot);

  const copy = {
    login: { title: t("auth.loginTitle"), description: t("auth.loginDesc"), submitText: t("auth.loginBtn") },
    register: { title: t("auth.registerTitle"), description: t("auth.registerDesc"), submitText: t("auth.registerBtn") },
    forgot: { title: t("auth.forgotTitle"), description: t("auth.forgotDesc"), submitText: t("auth.forgotBtn") },
  }[mode];
  const resolvedCopy =
    adminMode && mode === "login"
      ? {
          ...copy,
          title: t("auth.adminLoginTitle"),
          description: t("auth.adminLoginDesc"),
        }
      : copy;

  const claimNotice = buildClaimNotice(mode, accountHint, t);

  return {
    mode,
    setMode,
    form,
    setField,
    errors,
    loading,
    pendingAction,
    rememberMe,
    setRememberMePersisted,
    handleFormSubmit,
    handleGoogleLogin,
    copy: resolvedCopy,
    claimNotice,
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
  adminMode = false,
}: Readonly<{
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  t: (k: string) => string;
  adminMode?: boolean;
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
        {!adminMode && (
          <p className="text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <button type="button" onClick={() => onModeChange("register")} className="text-primary hover:underline">
              {t("auth.registerBtn")}
            </button>
          </p>
        )}
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

export default function AuthPage({ adminMode = false }: { adminMode?: boolean }) {
  const {
    mode,
    setMode,
    form,
    setField,
    errors,
    loading,
    pendingAction,
    rememberMe,
    setRememberMePersisted,
    handleFormSubmit,
    handleGoogleLogin,
    copy,
    claimNotice,
    t,
  } = useAuthForm({ adminMode });

  const showGoogle = mode === "login";
  const submitButtonLabel =
    pendingAction === "login"
      ? t("auth.loginPending")
      : pendingAction === "register"
        ? t("auth.registerPending")
        : pendingAction === "forgot"
          ? t("auth.forgotPending")
          : copy.submitText;
  const pendingMessage =
    pendingAction === "login"
      ? t("auth.loginPendingHint")
      : pendingAction === "register"
        ? t("auth.registerPendingHint")
        : pendingAction === "forgot"
          ? t("auth.forgotPendingHint")
          : pendingAction === "google"
            ? t("auth.googlePendingHint")
            : null;
  const googleButtonLabel = pendingAction === "google" ? t("auth.googlePending") : t("auth.googleBtn");

    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(201,168,76,0.10),_transparent_32%),linear-gradient(135deg,_#16120e_0%,_#0d0b09_52%,_#080808_100%)] p-4 safe-x safe-y relative overflow-x-hidden"
        data-testid="auth-page"
      >
        <div className="w-full max-w-[440px] min-w-0">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <LogoIcon size="md" />
          <span className="text-[26px] font-bold tracking-[0.04em] text-foreground">PAPI HAIR DESIGN</span>
        </div>

        <Card
          className="public-premium-shell rounded-[24px] border-[#C9A84C]/18 bg-[#12100d]/88 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85),0_0_0_1px_rgba(201,168,76,0.08)] backdrop-blur-md"
          data-testid="auth-card"
        >
          <CardHeader className="space-y-2 px-6 pt-6">
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            {claimNotice && (
              <div className="rounded-md border border-[#C9A84C]/24 bg-[#C9A84C]/8 px-4 py-3 text-sm text-white/85">
                <p className="font-semibold text-[#E7CA77]">{claimNotice.title}</p>
                <p className="mt-1 text-white/70">{claimNotice.body}</p>
              </div>
            )}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t("auth.emailPlaceholder")}
                  value={form.email}
                  onChange={setField("email")}
                  disabled={loading}
                  data-testid="auth-email-input"
                  className="min-h-12 rounded-[10px]"
                />
                {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
              </div>

              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={setField("password")}
                    disabled={loading}
                    className="min-h-12 rounded-[10px]"
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

              <Button type="submit" className="public-primary-cta w-full" disabled={loading} data-testid="auth-login-btn">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitButtonLabel}
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
                    className="public-primary-cta w-full border-white/12 bg-white/[0.02]"
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    data-testid="auth-google-btn"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                    {googleButtonLabel}
                  </Button>
                </>
              )}
            </form>

            {pendingMessage && (
              <p className="rounded-[10px] border border-white/8 bg-white/[0.03] px-4 py-3 text-center text-sm leading-6 text-white/68">
                {pendingMessage}
              </p>
            )}

            <div className="text-center text-sm space-y-2">
              <AuthModeLinks mode={mode} onModeChange={setMode} t={t} adminMode={adminMode} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 rounded-[18px] border border-white/8 bg-black/15 px-4 py-3 text-center text-sm text-muted-foreground">
          <span>
            {t("auth.bookingLink")}{" "}
            <a href="/booking" className="text-primary hover:underline">
              {t("auth.bookingLinkLabel")}
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
