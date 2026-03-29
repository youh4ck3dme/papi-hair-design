import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/integrations/firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronLeft,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  getFirebaseErrorCode,
  isBlockedByClientError,
  isIgnorableBlockedFirestoreError,
  warnBlockedByClientOnce,
} from "@/lib/firebaseClientErrors";

const PROFILES = [
  {
    id: "papi",
    label: "Papi",
    role: "Majiteľ & Kaderník",
    email: import.meta.env.VITE_PAPI_EMAIL ?? "",
    color: "#D7B465",
    photo: "/papi.webp",
    initials: "P",
    summaryKey: "salonLogin.accessOwnerDesc",
  },
  {
    id: "miska",
    label: "Miska",
    role: "Stylistka",
    email: import.meta.env.VITE_MISKA_EMAIL ?? "",
    color: "#C89B67",
    photo: "/miska.webp",
    initials: "M",
    summaryKey: "salonLogin.accessStaffDesc",
  },
  {
    id: "mato",
    label: "Mato",
    role: "Barber",
    email: import.meta.env.VITE_MATO_EMAIL ?? "",
    color: "#B98444",
    photo: "/mato.webp",
    initials: "M",
    summaryKey: "salonLogin.accessStaffDesc",
  },
] as const;

type ProfileId = (typeof PROFILES)[number]["id"];
type Phase = "intro" | "gate" | "picker" | "login";
type Profile = (typeof PROFILES)[number];

const ENTRY_PASSWORD = (import.meta.env.VITE_SALON_GATE_PASSWORD ?? "").trim();
const SALON_GATE_ENABLED = ENTRY_PASSWORD.length > 0;

const STYLES = `
  @keyframes salon-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .salon-fade-up {
    animation: salon-fade-up .6s cubic-bezier(.22,1,.36,1) both;
  }

  .salon-input::placeholder {
    color: rgba(255, 255, 255, 0.38);
  }

  @media (prefers-reduced-motion: reduce) {
    .salon-fade-up {
      animation: none !important;
    }
  }
`;

function Avatar({ profile, size }: { profile: Profile; size: number }) {
  if (profile.photo) {
    return (
      <img
        src={profile.photo}
        alt={profile.label}
        draggable={false}
        style={{ width: size, height: size }}
        className="rounded-[1.35rem] object-cover select-none"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-[1.35rem] border"
      style={{
        width: size,
        height: size,
        borderColor: `${profile.color}55`,
        background: `linear-gradient(135deg, ${profile.color}30 0%, rgba(10,10,10,.95) 100%)`,
      }}
    >
      <span className="text-3xl font-bold" style={{ color: profile.color }}>
        {profile.initials}
      </span>
    </div>
  );
}

function TeamProfileCard({
  profile,
  statusLabel,
  isActive,
  isLocked,
  onPick,
}: {
  profile: Profile;
  statusLabel: string;
  isActive: boolean;
  isLocked: boolean;
  onPick: (id: ProfileId) => void;
}) {
  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onPick(profile.id)}
      className={`group relative w-full overflow-hidden rounded-[2rem] border text-left transition-all duration-300 ${
        isActive
          ? "border-[#d7b465]/45 bg-black/85 shadow-[0_24px_70px_-42px_rgba(215,180,101,0.42)]"
          : "border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] hover:border-[#d7b465]/25 hover:bg-white/[0.03]"
      } ${isLocked ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_38%)]" />
      <div
        className="absolute right-[-2.4rem] top-[-3rem] h-40 w-40 rounded-full blur-3xl"
        style={{ background: `${profile.color}10` }}
      />
      <div className="absolute bottom-0 right-0 h-24 w-24 bg-[linear-gradient(135deg,transparent_0%,transparent_48%,rgba(215,180,101,0.96)_49%,rgba(215,180,101,0.9)_100%)]" />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] ${
              isActive
                ? "border-[#d7b465]/35 bg-[#d7b465]/10 text-[#e8cb88]"
                : "border-white/10 bg-black/45 text-white/42"
            }`}
          >
            {statusLabel}
          </span>
          <ArrowRight
            className={`h-4 w-4 transition-transform duration-300 ${
              isLocked ? "text-white/20" : "text-[#d7b465] group-hover:translate-x-1"
            }`}
          />
        </div>

        <div className="flex items-center gap-4">
          <Avatar profile={profile} size={88} />
          <div className="min-w-0">
            <h2 className="truncate text-[2rem] font-semibold tracking-tight text-white">
              {profile.label}
            </h2>
            <p
              className="mt-2 text-[12px] uppercase tracking-[0.34em]"
              style={{ color: profile.color }}
            >
              {profile.role}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

function PanelCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[0_22px_68px_-48px_rgba(0,0,0,0.95)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export default function SalonLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>(SALON_GATE_ENABLED ? "intro" : "picker");
  const [selected, setSelected] = useState<ProfileId | null>(null);
  const [entryPassword, setEntryPassword] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showEntryPwd, setShowEntryPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const profile = PROFILES.find((item) => item.id === selected) ?? null;
  const isUnlocked = !SALON_GATE_ENABLED || phase === "picker" || phase === "login";

  const openTeamAccess = () => {
    setPhase(SALON_GATE_ENABLED ? "gate" : "picker");
  };

  const unlockProfiles = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!SALON_GATE_ENABLED) {
      setPhase("picker");
      return;
    }

    if (entryPassword.trim() !== ENTRY_PASSWORD) {
      toast.error(t("salonLogin.toastGateWrongPassword"));
      return;
    }

    setEntryPassword("");
    setShowEntryPwd(false);
    setPhase("picker");
  };

  const pickProfile = (id: ProfileId) => {
    setSelected(id);
    setPassword("");
    setShowPwd(false);
    setPhase("login");
  };

  const backToIntro = () => {
    setEntryPassword("");
    setShowEntryPwd(false);
    setSelected(null);
    setPassword("");
    setPhase("intro");
  };

  const backToProfiles = () => {
    setSelected(null);
    setPassword("");
    setShowPwd(false);
    setLoading(false);
    setPhase("picker");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile || !password) {
      return;
    }

    if (!profile.email) {
      toast.error(t("salonLogin.toastEmailMissing", { name: profile.label }));
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, profile.email, password);
      toast.success(t("salonLogin.toastWelcome", { name: profile.label }));
      navigate("/admin/calendar");
    } catch (error) {
      if (auth.currentUser) {
        toast.success(t("salonLogin.toastWelcome", { name: profile.label }));
        navigate("/admin/calendar");
        return;
      }

      if (isIgnorableBlockedFirestoreError(error) || isBlockedByClientError(error)) {
        warnBlockedByClientOnce((message) => toast.warning(message));
      }

      const code = getFirebaseErrorCode(error);
      const isCredentialIssue =
        code.includes("wrong-password") ||
        code.includes("invalid-login-credentials") ||
        code.includes("user-not-found") ||
        code.includes("invalid-credential");

      if (isCredentialIssue) {
        toast.error(t("salonLogin.toastWrongPassword"));
      } else {
        toast.error("Prihlásenie zlyhalo. Skúste to znova.");
      }
    } finally {
      setPassword("");
      setLoading(false);
    }
  };

  const renderIntro = () => (
    <div className="salon-fade-up space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#d7b465]/82">
          {t("salonLogin.gateTitle")}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {t("salonLogin.introTitle")}
        </h1>
        <p className="max-w-[36rem] text-base leading-8 text-white/62">
          {t("salonLogin.introDesc")}
        </p>
      </div>

      <Link
        to="/"
        className="inline-flex min-h-[48px] w-full items-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:border-[#d7b465]/24 hover:bg-white/[0.05]"
      >
        {t("salonLogin.homeLink")}
      </Link>

      <PanelCard>
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d7b465]/18 bg-[#d7b465]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d7b465]">
            <LockKeyhole className="h-4 w-4" />
            {t("salonLogin.heroEyebrow")}
          </div>

          <button
            type="button"
            onClick={openTeamAccess}
            className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#b98a33] via-[#d7b465] to-[#f0d78c] px-6 text-sm font-bold uppercase tracking-[0.22em] text-[#140d00] shadow-[0_16px_40px_-20px_rgba(215,180,101,0.7)] transition-transform hover:scale-[1.01]"
          >
            {t("salonLogin.primaryCta")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </PanelCard>
    </div>
  );

  const renderGate = () => (
    <div className="salon-fade-up space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#d7b465]/82">
          {t("salonLogin.gateTitle")}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {t("salonLogin.gateTitle")}
        </h1>
        <p className="max-w-[36rem] text-base leading-8 text-white/62">
          {t("salonLogin.gateHint")}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={backToIntro}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:border-[#d7b465]/24 hover:bg-white/[0.05] sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("salonLogin.back")}
        </button>

        <Link
          to="/"
          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:border-[#d7b465]/24 hover:bg-white/[0.05] sm:w-auto"
        >
          {t("salonLogin.homeLink")}
        </Link>
      </div>

      <PanelCard>
        <form onSubmit={unlockProfiles} className="space-y-4">
          <div className="flex items-center rounded-2xl border border-[#d7b465]/32 bg-black/45">
            <input
              type={showEntryPwd ? "text" : "password"}
              autoFocus
              value={entryPassword}
              onChange={(event) => setEntryPassword(event.target.value)}
              placeholder={t("salonLogin.gatePlaceholder")}
              className="salon-input min-h-[56px] flex-1 bg-transparent px-4 text-sm text-white outline-none"
            />
            <button
              type="button"
              onClick={() => setShowEntryPwd((value) => !value)}
              className="inline-flex min-h-[56px] min-w-[56px] items-center justify-center text-white/38 transition-colors hover:text-white/72"
              aria-label={showEntryPwd ? "Skryť heslo" : "Zobraziť heslo"}
            >
              {showEntryPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={!entryPassword.trim()}
            className="inline-flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#b98a33] via-[#d7b465] to-[#f0d78c] px-6 text-sm font-bold uppercase tracking-[0.22em] text-[#140d00] shadow-[0_16px_40px_-20px_rgba(215,180,101,0.7)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("salonLogin.gateButton")}
          </button>
        </form>
      </PanelCard>
    </div>
  );

  const renderPicker = () => (
    <div className="salon-fade-up flex min-h-[calc(100svh-5.5rem)] min-h-[calc(100vh-5.5rem)] items-center">
      <div className="grid w-full gap-4 lg:grid-cols-3">
        {PROFILES.map((member) => (
          <TeamProfileCard
            key={member.id}
            profile={member}
            isLocked={!isUnlocked}
            isActive={selected === member.id}
            statusLabel={
              !isUnlocked
                ? t("salonLogin.lockedBadge")
                : selected === member.id
                  ? t("salonLogin.selectedBadge")
                  : t("salonLogin.chooseProfile")
            }
            onPick={pickProfile}
          />
        ))}
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="salon-fade-up space-y-5">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {t("salonLogin.loginTitle", { name: profile?.label ?? "" })}
        </h1>
        <p className="max-w-[36rem] text-base leading-8 text-white/62">
          {t("salonLogin.loginDesc")}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={backToProfiles}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:border-[#d7b465]/24 hover:bg-white/[0.05] sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("salonLogin.back")}
        </button>

        <Link
          to="/"
          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:border-[#d7b465]/24 hover:bg-white/[0.05] sm:w-auto"
        >
          {t("salonLogin.homeLink")}
        </Link>
      </div>

      {profile && (
        <>
          <TeamProfileCard
            profile={profile}
            isLocked={false}
            isActive
            statusLabel={t("salonLogin.selectedBadge")}
            onPick={() => {}}
          />

          <PanelCard>
            <form onSubmit={handleLogin} className="space-y-4">
              <div
                className="flex items-center rounded-2xl border bg-black/45"
                style={{ borderColor: `${profile.color}4f` }}
              >
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("salonLogin.passwordPlaceholder")}
                  className="salon-input min-h-[56px] flex-1 bg-transparent px-4 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((value) => !value)}
                  className="inline-flex min-h-[56px] min-w-[56px] items-center justify-center text-white/38 transition-colors hover:text-white/72"
                  aria-label={showPwd ? "Skryť heslo" : "Zobraziť heslo"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!password || loading}
                className="inline-flex min-h-[54px] w-full items-center justify-center rounded-2xl px-6 text-sm font-bold uppercase tracking-[0.22em] text-[#140d00] shadow-[0_16px_40px_-20px_rgba(215,180,101,0.7)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${profile.color} 0%, #f0d78c 100%)`,
                }}
              >
                {loading ? t("common.loading") : t("salonLogin.loginBtn")}
              </button>
            </form>
          </PanelCard>
        </>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen min-h-[100svh] overflow-x-hidden bg-[#040404] text-white">
      <style>{STYLES}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-16 h-64 w-64 rounded-full bg-[#d7b465]/10 blur-3xl" />
        <div className="absolute -right-16 top-80 h-72 w-72 rounded-full bg-[#8a5b26]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(215,180,101,0.12),transparent_26%),linear-gradient(180deg,#030303_0%,#070707_52%,#030303_100%)]" />
      </div>

      <div
        className="fixed left-4 top-4 z-20 flex items-center gap-2 safe-left safe-top"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        <LanguageToggle />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 pb-10 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        {phase === "intro" && renderIntro()}
        {phase === "gate" && renderGate()}
        {phase === "picker" && renderPicker()}
        {phase === "login" && renderLogin()}
      </main>
    </div>
  );
}
