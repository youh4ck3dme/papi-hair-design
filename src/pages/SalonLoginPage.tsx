import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/integrations/firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LogoIcon } from "@/components/LogoIcon";

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

const ENTRY_PASSWORD = (import.meta.env.VITE_SALON_GATE_PASSWORD ?? "").trim();
const SALON_GATE_ENABLED = ENTRY_PASSWORD.length > 0;

const STYLES = `
  @keyframes salon-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes salon-glow-drift {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .72; }
    50% { transform: translate3d(18px, -16px, 0) scale(1.08); opacity: 1; }
  }

  .salon-fade-up {
    animation: salon-fade-up .7s cubic-bezier(.22,1,.36,1) both;
  }

  .salon-ambient {
    animation: salon-glow-drift 14s ease-in-out infinite;
  }

  .salon-input::placeholder {
    color: rgba(255, 255, 255, 0.38);
  }

  @media (prefers-reduced-motion: reduce) {
    .salon-fade-up,
    .salon-ambient {
      animation: none !important;
    }
  }
`;

type Profile = (typeof PROFILES)[number];

function Avatar({ profile, size }: { profile: Profile; size: number }) {
  if (profile.photo) {
    return (
      <img
        src={profile.photo}
        alt={profile.label}
        draggable={false}
        style={{ width: size, height: size }}
        className="rounded-[1.3rem] object-cover select-none"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-[1.3rem] border"
      style={{
        width: size,
        height: size,
        borderColor: `${profile.color}55`,
        background: `linear-gradient(135deg, ${profile.color}30 0%, rgba(10,10,10,.95) 100%)`,
      }}
    >
      <span
        className="text-3xl font-bold"
        style={{ color: profile.color }}
      >
        {profile.initials}
      </span>
    </div>
  );
}

function AccessFeature({
  Icon,
  title,
  description,
}: {
  Icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/8 bg-white/[0.025] p-5 shadow-[0_18px_48px_-36px_rgba(0,0,0,0.9)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d7b465]/20 bg-[#d7b465]/10 text-[#d7b465]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-white/58">{description}</p>
    </div>
  );
}

function TeamProfileCard({
  profile,
  isLocked,
  isActive,
  statusLabel,
  onPick,
  summary,
}: {
  profile: Profile;
  isLocked: boolean;
  isActive: boolean;
  statusLabel: string;
  onPick: (id: ProfileId) => void;
  summary: string;
}) {
  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onPick(profile.id)}
      className={`group relative overflow-hidden rounded-[30px] border text-left transition-all duration-300 ${
        isActive
          ? "border-[#d7b465]/55 bg-black/80 shadow-[0_22px_72px_-36px_rgba(215,180,101,0.35)]"
          : "border-white/8 bg-white/[0.02] hover:-translate-y-1 hover:border-[#d7b465]/28 hover:bg-white/[0.04]"
      } ${isLocked ? "cursor-not-allowed opacity-75" : ""}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_44%)]" />
      <div
        className="absolute -right-10 top-[-3.5rem] h-40 w-40 rounded-full blur-3xl"
        style={{ background: `${profile.color}18` }}
      />
      <div className="absolute bottom-0 right-0 h-16 w-16 bg-[linear-gradient(135deg,transparent_0%,transparent_38%,rgba(215,180,101,0.95)_39%,rgba(215,180,101,0.78)_100%)]" />

      <div className="relative flex h-full flex-col gap-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${
              isActive
                ? "border-[#d7b465]/35 bg-[#d7b465]/10 text-[#e8cb88]"
                : "border-white/10 bg-black/35 text-white/45"
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
            <h3 className="truncate text-2xl font-semibold tracking-tight text-white">
              {profile.label}
            </h3>
            <p
              className="mt-1 text-[11px] font-medium uppercase tracking-[0.24em]"
              style={{ color: profile.color }}
            >
              {profile.role}
            </p>
          </div>
        </div>

        <p className="max-w-[32ch] text-sm leading-7 text-white/58">{summary}</p>
      </div>
    </button>
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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const teamRef = useRef<HTMLElement | null>(null);

  const profile = PROFILES.find((item) => item.id === selected) ?? null;
  const isUnlocked = !SALON_GATE_ENABLED || phase === "picker" || phase === "login";

  const heroStats = [
    {
      Icon: ShieldCheck,
      title: t("salonLogin.heroStatOwnerTitle"),
      description: t("salonLogin.heroStatOwnerDesc"),
    },
    {
      Icon: Users2,
      title: t("salonLogin.heroStatTeamTitle"),
      description: t("salonLogin.heroStatTeamDesc"),
    },
    {
      Icon: Smartphone,
      title: t("salonLogin.heroStatMobileTitle"),
      description: t("salonLogin.heroStatMobileDesc"),
    },
  ];

  const accessFeatures = [
    {
      Icon: ShieldCheck,
      title: t("salonLogin.accessOwnerTitle"),
      description: t("salonLogin.accessOwnerDesc"),
    },
    {
      Icon: Users2,
      title: t("salonLogin.accessStaffTitle"),
      description: t("salonLogin.accessStaffDesc"),
    },
    {
      Icon: CalendarDays,
      title: t("salonLogin.accessMobileTitle"),
      description: t("salonLogin.accessMobileDesc"),
    },
  ];

  const scrollToSection = (ref: { current: HTMLElement | HTMLDivElement | null }) => {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const openTeamAccess = () => {
    if (SALON_GATE_ENABLED) {
      setPhase("gate");
      scrollToSection(panelRef);
      return;
    }

    setPhase("picker");
    scrollToSection(teamRef);
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
    scrollToSection(teamRef);
  };

  const pickProfile = (id: ProfileId) => {
    setSelected(id);
    setPassword("");
    setShowPwd(false);
    setPhase("login");
    scrollToSection(panelRef);
  };

  const backToIntro = () => {
    setEntryPassword("");
    setShowEntryPwd(false);
    setPhase("intro");
    setSelected(null);
    setPassword("");
  };

  const backToProfiles = () => {
    setSelected(null);
    setPassword("");
    setShowPwd(false);
    setLoading(false);
    setPhase("picker");
    scrollToSection(teamRef);
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
    } catch {
      toast.error(t("salonLogin.toastWrongPassword"));
      setPassword("");
      setLoading(false);
    }
  };

  const renderPanelContent = () => {
    if (phase === "intro") {
      return (
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d7b465]/18 bg-[#d7b465]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d7b465]">
            <LockKeyhole className="h-4 w-4" />
            {t("salonLogin.gateTitle")}
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("salonLogin.introTitle")}
            </h2>
            <p className="max-w-xl text-sm leading-7 text-white/62 sm:text-base">
              {t("salonLogin.introDesc")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[t("salonLogin.introStepGate"), t("salonLogin.introStepPick"), t("salonLogin.introStepLogin")].map(
              (step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/8 bg-black/35 p-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                    0{index + 1}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-white">{step}</p>
                </div>
              ),
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openTeamAccess}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#b98a33] via-[#d7b465] to-[#f0d78c] px-6 text-sm font-bold uppercase tracking-[0.2em] text-[#140d00] shadow-[0_16px_40px_-20px_rgba(215,180,101,0.7)] transition-transform hover:scale-[1.01]"
            >
              {t("salonLogin.primaryCta")}
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate("/booking")}
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#d7b465]/28 hover:bg-white/[0.05]"
            >
              {t("salonLogin.bookingShortcut")}
            </button>
          </div>
        </div>
      );
    }

    if (phase === "gate") {
      return (
        <div className="space-y-6">
          <button
            type="button"
            onClick={backToIntro}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/45 transition-colors hover:text-white/78"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("salonLogin.back")}
          </button>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {t("salonLogin.gateTitle")}
            </h2>
            <p className="text-sm leading-7 text-white/62 sm:text-base">
              {t("salonLogin.gateHint")}
            </p>
          </div>

          <form onSubmit={unlockProfiles} className="space-y-4">
            <div className="flex items-center rounded-2xl border border-[#d7b465]/32 bg-black/45">
              <input
                type={showEntryPwd ? "text" : "password"}
                autoFocus
                value={entryPassword}
                onChange={(event) => setEntryPassword(event.target.value)}
                placeholder={t("salonLogin.gatePlaceholder")}
                className="salon-input min-h-[54px] flex-1 bg-transparent px-4 text-sm text-white outline-none"
              />
              <button
                type="button"
                onClick={() => setShowEntryPwd((value) => !value)}
                className="inline-flex min-h-[54px] min-w-[54px] items-center justify-center text-white/38 transition-colors hover:text-white/72"
                aria-label={showEntryPwd ? "Skryť heslo" : "Zobraziť heslo"}
              >
                {showEntryPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!entryPassword.trim()}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#b98a33] via-[#d7b465] to-[#f0d78c] px-6 text-sm font-bold uppercase tracking-[0.2em] text-[#140d00] shadow-[0_16px_40px_-20px_rgba(215,180,101,0.7)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("salonLogin.gateButton")}
            </button>
          </form>
        </div>
      );
    }

    if (phase === "picker") {
      return (
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d7b465]/18 bg-[#d7b465]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d7b465]">
            <Users2 className="h-4 w-4" />
            {t("salonLogin.teamTitle")}
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {t("salonLogin.pickerTitle")}
            </h2>
            <p className="text-sm leading-7 text-white/62 sm:text-base">
              {t("salonLogin.pickerDesc")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {PROFILES.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-white/8 bg-black/35 p-4 text-left"
              >
                <p className="text-sm font-semibold text-white">{member.label}</p>
                <p
                  className="mt-2 text-[11px] uppercase tracking-[0.24em]"
                  style={{ color: member.color }}
                >
                  {member.role}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollToSection(teamRef)}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#d7b465]/28 hover:bg-white/[0.05]"
          >
            {t("salonLogin.chooseProfile")}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={backToProfiles}
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/45 transition-colors hover:text-white/78"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("salonLogin.back")}
        </button>

        {profile && (
          <>
            <div className="flex items-center gap-4 rounded-[28px] border border-white/8 bg-black/35 p-4">
              <Avatar profile={profile} size={88} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                  {t("salonLogin.selectedBadge")}
                </p>
                <h2 className="mt-2 truncate text-2xl font-semibold text-white">
                  {profile.label}
                </h2>
                <p
                  className="mt-1 text-[11px] uppercase tracking-[0.24em]"
                  style={{ color: profile.color }}
                >
                  {profile.role}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-bold tracking-tight text-white">
                {t("salonLogin.loginTitle", { name: profile.label })}
              </h3>
              <p className="text-sm leading-7 text-white/62 sm:text-base">
                {t("salonLogin.loginDesc")}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex items-center rounded-2xl border bg-black/45" style={{ borderColor: `${profile.color}4f` }}>
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("salonLogin.passwordPlaceholder")}
                  className="salon-input min-h-[54px] flex-1 bg-transparent px-4 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((value) => !value)}
                  className="inline-flex min-h-[54px] min-w-[54px] items-center justify-center text-white/38 transition-colors hover:text-white/72"
                  aria-label={showPwd ? "Skryť heslo" : "Zobraziť heslo"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!password || loading}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-6 text-sm font-bold uppercase tracking-[0.2em] text-[#140d00] shadow-[0_16px_40px_-20px_rgba(215,180,101,0.7)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${profile.color} 0%, #f0d78c 100%)`,
                }}
              >
                {loading ? t("common.loading") : t("salonLogin.loginBtn")}
              </button>
            </form>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#040404] text-white">
      <style>{STYLES}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="salon-ambient absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#d7b465]/10 blur-3xl" />
        <div
          className="salon-ambient absolute right-[-4rem] top-[18rem] h-80 w-80 rounded-full bg-[#8a5b26]/12 blur-3xl"
          style={{ animationDelay: "-6s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(215,180,101,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_16%),linear-gradient(180deg,#030303_0%,#070707_48%,#030303_100%)]" />
      </div>

      <header className="relative z-20 border-b border-white/8 bg-black/72 backdrop-blur-sm">
        <div
          className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-full border border-white/6 bg-white/[0.02] px-3 py-2 transition-colors hover:border-[#d7b465]/20 hover:bg-white/[0.04]"
          >
            <LogoIcon size="md" className="shadow-[0_0_24px_rgba(215,180,101,0.18)]" />
            <div className="text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                PAPI HAIR
              </p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#d7b465]">
                DESIGN
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/booking")}
              className="hidden min-h-[44px] items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#d7b465]/24 hover:bg-white/[0.05] sm:inline-flex"
            >
              {t("salonLogin.bookingShortcut")}
            </button>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)]">
          <div className="salon-fade-up relative overflow-hidden rounded-[34px] border border-[#d7b465]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 shadow-[0_28px_90px_-54px_rgba(215,180,101,0.32)] sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(215,180,101,0.16),transparent_34%),linear-gradient(140deg,rgba(255,255,255,0.04),transparent_42%)]" />

            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d7b465]/18 bg-[#d7b465]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d7b465]">
                  <LockKeyhole className="h-4 w-4" />
                  {t("salonLogin.heroEyebrow")}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-4xl font-bold uppercase tracking-[0.18em] text-white sm:text-5xl xl:text-6xl">
                      PAPI HAIR
                    </p>
                    <p className="mt-2 text-xl font-light uppercase tracking-[0.34em] text-[#d7b465] sm:text-2xl">
                      DESIGN
                    </p>
                  </div>

                  <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl xl:text-5xl">
                    {t("salonLogin.heroTitle")}
                  </h1>

                  <p className="max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
                    {t("salonLogin.heroDesc")}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {heroStats.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/8 bg-black/35 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d7b465]/16 bg-[#d7b465]/10 text-[#d7b465]">
                        <item.Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/55">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {PROFILES.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-[1rem] border-2 border-[#040404] bg-black shadow-[0_0_18px_rgba(0,0,0,0.45)]"
                      >
                        <Avatar profile={member} size={54} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t("salonLogin.teamTitle")}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">
                      3 profiles · booking · calendar
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={openTeamAccess}
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#b98a33] via-[#d7b465] to-[#f0d78c] px-6 text-sm font-bold uppercase tracking-[0.2em] text-[#140d00] shadow-[0_16px_40px_-20px_rgba(215,180,101,0.7)] transition-transform hover:scale-[1.01]"
                  >
                    {t("salonLogin.primaryCta")}
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/booking")}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#d7b465]/28 hover:bg-white/[0.05]"
                  >
                    {t("salonLogin.bookingShortcut")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside
            ref={panelRef}
            className="salon-fade-up lg:sticky lg:top-24"
            style={{ animationDelay: "0.08s" }}
          >
            <div className="relative overflow-hidden rounded-[34px] border border-white/8 bg-[#080808] p-6 shadow-[0_26px_88px_-56px_rgba(0,0,0,0.95)] sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(215,180,101,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_46%)]" />
              <div className="relative">{renderPanelContent()}</div>
            </div>
          </aside>
        </section>

        <section
          ref={teamRef}
          className="salon-fade-up space-y-5"
          style={{ animationDelay: "0.14s" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d7b465]/80">
                {t("salonLogin.teamTitle")}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("salonLogin.teamTitle")}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/58 sm:text-base">
                {isUnlocked ? t("salonLogin.teamDescReady") : t("salonLogin.teamDescLocked")}
              </p>
            </div>

            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#d7b465]/24 hover:bg-white/[0.05]"
            >
              {t("salonLogin.homeLink")}
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
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
                summary={t(member.summaryKey)}
              />
            ))}
          </div>
        </section>

        <section
          className="salon-fade-up space-y-5"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d7b465]/80">
              {t("salonLogin.accessTitle")}
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("salonLogin.accessTitle")}
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {accessFeatures.map((item) => (
              <AccessFeature
                key={item.title}
                Icon={item.Icon}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
