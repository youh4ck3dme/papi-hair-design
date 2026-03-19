import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/integrations/firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import { Eye, EyeOff, ChevronLeft, Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Profile definitions ──────────────────────────────────────────────────────
const PROFILES = [
    {
        id: "papi",
        label: "Papi",
        role: "Majiteľ & Kaderník",
        email: import.meta.env.VITE_PAPI_EMAIL ?? "",
        color: "#C9A84C",
        photo: "/papi.webp",
        initials: "P",
    },
    {
        id: "miska",
        label: "Miska",
        role: "Stylistka",
        email: import.meta.env.VITE_MISKA_EMAIL ?? "",
        color: "#B794F4", // Lighter Violet for better contrast
        photo: "/miska.webp",
        initials: "M",
    },
    {
        id: "mato",
        label: "Mato",
        role: "Barber",
        email: import.meta.env.VITE_MATO_EMAIL ?? "",
        color: "#60A5FA", // Lighter Blue for better contrast
        photo: "/mato.webp",
        initials: "M",
    },
] as const;

type ProfileId = (typeof PROFILES)[number]["id"];
type Phase = "intro" | "gate" | "picker" | "login";
const ENTRY_PASSWORD = import.meta.env.VITE_SALON_GATE_PASSWORD ?? "88888888";

// ── Responsive avatar size ───────────────────────────────────────────────────
function calcAvatarPx(w: number, h: number): number {
    const base = Math.min(w, h);
    if (w < 375) return Math.min(220, Math.max(136, Math.round(base * 0.42)));
    if (w < 640) return Math.min(260, Math.max(156, Math.round(base * 0.45)));
    if (w < 1024) return Math.min(320, Math.max(196, Math.round(base * 0.42)));
    return Math.min(420, Math.max(240, Math.round(base * 0.48)));
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({
    profile,
    size = 120,
}: {
    profile: (typeof PROFILES)[number];
    size?: number;
}) {
    if (profile.photo) {
        return (
            <img
                src={profile.photo}
                alt={profile.label}
                draggable={false}
                style={{ width: size, height: size }}
                className="rounded-2xl object-cover select-none"
            />
        );
    }
    return (
        <div
            style={{
                width: size,
                height: size,
                background: `radial-gradient(135deg, ${profile.color}55 0%, ${profile.color}22 100%)`,
                border: `2px solid ${profile.color}66`,
            }}
            className="rounded-2xl flex items-center justify-center"
        >
            <span
                style={{ color: profile.color, fontSize: size * 0.4 }}
                className="font-bold select-none"
            >
                {profile.initials}
            </span>
        </div>
    );
}

type StarPoint = {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    phase: number;
    twinkleSpeed: number;
    warm: boolean;
};

// ── Lightweight Starry Sky background (mobile-friendly, older devices) ──────
function LiquidGoldBg({
    mouseRef,
    enabled,
}: {
    mouseRef: React.RefObject<[number, number]>;
    enabled: boolean;
}) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!enabled) return;
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        const lowPowerClass = document.documentElement.classList.contains("phd-low-power");
        const cores = navigator.hardwareConcurrency ?? 4;
        const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
        const isLowEnd = lowPowerClass || cores <= 2 || memory <= 2;

        let cssW = 0;
        let cssH = 0;
        let stars: StarPoint[] = [];
        let raf = 0;
        let lastPaint = 0;
        const targetFps = isLowEnd ? 18 : 28;
        const minFrameMs = 1000 / targetFps;

        const rebuildStars = () => {
            const area = cssW * cssH;
            const density = isLowEnd ? 26000 : 19000;
            const maxStars = isLowEnd ? 120 : 190;
            const count = Math.max(60, Math.min(maxStars, Math.floor(area / density)));
            stars = Array.from({ length: count }, () => ({
                x: Math.random() * cssW,
                y: Math.random() * cssH,
                radius: Math.random() * 1.4 + 0.35,
                alpha: Math.random() * 0.55 + 0.25,
                phase: Math.random() * Math.PI * 2,
                twinkleSpeed: Math.random() * 1.1 + 0.35,
                warm: Math.random() < 0.2,
            }));
        };

        const resize = () => {
            cssW = Math.max(1, window.innerWidth);
            cssH = Math.max(1, window.innerHeight);
            const dprCap = isLowEnd ? 1 : 1.5;
            const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
            canvas.width = Math.floor(cssW * dpr);
            canvas.height = Math.floor(cssH * dpr);
            canvas.style.width = `${cssW}px`;
            canvas.style.height = `${cssH}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            rebuildStars();
        };

        const draw = (nowMs: number) => {
            ctx.fillStyle = "#04060f";
            ctx.fillRect(0, 0, cssW, cssH);

            const gradient = ctx.createLinearGradient(0, 0, 0, cssH);
            gradient.addColorStop(0, "rgba(14,19,38,0.65)");
            gradient.addColorStop(1, "rgba(2,4,10,0.82)");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, cssW, cssH);

            const mx = mouseRef.current?.[0] ?? 0.5;
            const my = mouseRef.current?.[1] ?? 0.5;
            const shiftX = (mx - 0.5) * (isLowEnd ? 4 : 8);
            const shiftY = (0.5 - my) * (isLowEnd ? 3 : 6);
            const t = nowMs / 1000;

            for (const s of stars) {
                const twinkle = prefersReducedMotion ? 1 : 0.65 + Math.sin(t * s.twinkleSpeed + s.phase) * 0.35;
                const alpha = Math.max(0.1, s.alpha * twinkle);
                const x = (s.x + shiftX + cssW) % cssW;
                const y = (s.y + shiftY + cssH) % cssH;
                ctx.beginPath();
                ctx.fillStyle = s.warm
                    ? `rgba(230, 200, 130, ${alpha.toFixed(3)})`
                    : `rgba(220, 235, 255, ${alpha.toFixed(3)})`;
                ctx.arc(x, y, s.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            if (prefersReducedMotion) return;
            if (now - lastPaint < minFrameMs) return;
            lastPaint = now;
            draw(now);
        };

        resize();
        draw(performance.now());
        window.addEventListener("resize", resize, { passive: true });
        if (!prefersReducedMotion) {
            raf = requestAnimationFrame(frame);
        }

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <canvas
            ref={ref}
            aria-hidden="true"
            style={{
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                zIndex: 0,
            }}
        />
    );
}

// ── NÁPAD 2: Venetian Overlay — barber blinds opening effect ─────────────────
function VenetianOverlay({ active, strips = 14 }: { active: boolean; strips?: number }) {
    if (!active) return null;
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 overflow-hidden"
            style={{ zIndex: 60 }}
        >
            {Array.from({ length: strips }, (_, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        height: `${100 / strips}%`,
                        top: `${(i / strips) * 100}%`,
                        background: "#050505",
                        transformOrigin: i % 2 === 0 ? "top center" : "bottom center",
                        animation: `phd-blind 0.75s ${i * 0.052}s cubic-bezier(.22,1,.36,1) forwards`,
                    }}
                />
            ))}
        </div>
    );
}

// ── NÁPAD 3: PickerCard — holographic 3D tilt member card ────────────────────
function PickerCard({
    p,
    avatarPx,
    sectionMode = false,
    stacked = false,
    compact = false,
    onPick,
}: {
    p: (typeof PROFILES)[number];
    avatarPx: number;
    sectionMode?: boolean;
    stacked?: boolean;
    compact?: boolean;
    onPick: (id: ProfileId) => void;
}) {
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);
    const [canTilt, setCanTilt] = useState(false);

    useEffect(() => {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
        setCanTilt(!reduce && !coarse);
    }, []);

    const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!canTilt) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = (e.clientX - rect.left) / rect.width - 0.5;
        const cy = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: cx * 16, y: cy * -12 });
    };

    const holoAngle = 180 + tilt.x * 14;

    return (
        <button
            onClick={() => onPick(p.id)}
            onMouseMove={onMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false); }}
            className="group flex flex-col items-center gap-2 sm:gap-2.5 focus:outline-none relative overflow-hidden"
            style={{
                width: compact
                    ? "clamp(108px, 29.2vw, 260px)"
                    : sectionMode || stacked
                    ? "min(92vw, 620px)"
                    : "auto",
                height: sectionMode
                    ? "min(84vh, 860px)"
                    : compact
                    ? "min(36vh, 310px)"
                    : stacked
                    ? "min(34vh, 360px)"
                    : undefined,
                borderRadius: sectionMode || stacked ? "2rem" : "1.6rem",
                padding: sectionMode
                    ? "22px 20px 28px"
                    : compact
                    ? "12px 10px 14px"
                    : stacked
                    ? "18px 18px 22px"
                    : "12px 12px 16px",
                background: hovered
                    ? `rgba(255,255,255,0.07)`
                    : "rgba(255,255,255,0.04)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: `1px solid ${hovered ? p.color + "60" : p.color + "28"}`,
                boxShadow: hovered
                    ? `0 20px 56px rgba(0,0,0,0.6), 0 0 40px ${p.color}28, inset 0 1px 0 ${p.color}28`
                    : `0 8px 28px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.07)`,
                transform: `perspective(650px) rotateY(${canTilt ? tilt.x : 0}deg) rotateX(${canTilt ? tilt.y : 0}deg) scale(${hovered ? 1.04 : 1}) translateY(${hovered ? -5 : 0}px)`,
                transition: hovered
                    ? "border .15s, box-shadow .15s, background .15s, transform .05s"
                    : "border .4s, box-shadow .4s, background .4s, transform .55s cubic-bezier(.22,1,.36,1)",
            }}
        >
            {/* Holographic iridescent overlay */}
            <div
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    background: `conic-gradient(from ${holoAngle}deg, #ff006644, #ffaa0055, #00ff6644, #00aaff55, #aa00ff44, #ff006644)`,
                    mixBlendMode: "color-dodge",
                    opacity: hovered ? 0.22 : 0,
                    transition: "opacity .2s",
                    pointerEvents: "none",
                }}
            />

            {/* Light sweep shimmer on hover */}
            <div
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    background: `linear-gradient(${105 + tilt.x * 2}deg, transparent 35%, rgba(255,255,255,0.08) 50%, transparent 65%)`,
                    opacity: hovered ? 1 : 0,
                    transition: "opacity .2s",
                    pointerEvents: "none",
                }}
            />

            {/* Avatar with gradient overlay */}
            <div className="relative rounded-[1.1rem] sm:rounded-[1.3rem] overflow-hidden">
                <Avatar profile={p} size={avatarPx} />
                <div
                    className="absolute inset-0 transition-opacity duration-300"
                    style={{
                        background: `linear-gradient(to top, ${p.color}50 0%, transparent 58%)`,
                        opacity: hovered ? 1 : 0,
                    }}
                />
            </div>

            {/* Name */}
            <span
                className={`${sectionMode ? "text-base sm:text-xl lg:text-2xl" : compact ? "text-[11px] sm:text-sm lg:text-base" : stacked ? "text-sm sm:text-lg lg:text-xl" : "text-xs sm:text-sm lg:text-base"} font-bold tracking-wider transition-colors duration-200`}
                style={{ color: hovered ? "#ffffff" : "rgba(255,255,255,0.92)" }}
            >
                {p.label}
            </span>

            {/* Role label — new */}
            <span
                className={`${sectionMode ? "text-[11px] sm:text-xs" : compact ? "text-[9px] sm:text-[10px]" : stacked ? "text-[10px] sm:text-xs" : "text-[9px] sm:text-[10px]"} font-medium tracking-[0.14em] uppercase transition-colors duration-300`}
                style={{ color: hovered ? p.color : "rgba(255,255,255,0.55)" }}
            >
                {p.role}
            </span>
        </button>
    );
}

// ── Keyframes (inline style tag) ─────────────────────────────────────────────
const STYLES = `
  @keyframes phd-logo-in {
    0%   { filter: blur(28px) brightness(.35); opacity: 0;    transform: scale(1.06); }
    55%  { filter: blur(7px)  brightness(.82); opacity: .82;  transform: scale(1.02); }
    100% { filter: blur(0px)  brightness(1);   opacity: 1;    transform: scale(1);    }
  }
  @keyframes phd-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes phd-shimmer {
    0%   { background-position: -220% center; }
    100% { background-position:  220% center; }
  }
  @keyframes phd-glow {
    0%,100% { box-shadow: 0 0 18px #C9A84C55, 0 0 42px #C9A84C22, inset 0 0 12px #C9A84C18; }
    50%     { box-shadow: 0 0 30px #C9A84C99, 0 0 66px #C9A84C44, inset 0 0 20px #C9A84C33; }
  }
  @keyframes phd-slide {
    from { opacity: 0; transform: translateY(26px) scale(.97); }
    to   { opacity: 1; transform: translateY(0) scale(1);      }
  }
  @keyframes phd-particle {
    0%   { opacity: 0; transform: translateY(0); }
    20%  { opacity: 0.55; }
    80%  { opacity: 0.18; }
    100% { opacity: 0; transform: translateY(-80px); }
  }
  @keyframes phd-spin { to { transform: rotate(360deg); } }
  @keyframes phd-blind {
    0%   { transform: scaleY(1); }
    100% { transform: scaleY(0); }
  }
  .phd-logo  { animation: phd-logo-in 1.5s cubic-bezier(.22,1,.36,1) forwards; }
  .phd-slide { animation: phd-slide   .6s  cubic-bezier(.22,1,.36,1) forwards; }
  .phd-pwd-input::placeholder { color: rgba(201,168,76,0.65); }
  .salon-surface-light {
    background: radial-gradient(circle at 15% 15%, #ffffff 0%, #f8fafc 46%, #e2e8f0 100%);
  }
  .salon-surface-light .phd-pwd-input {
    color: #0f172a !important;
  }
  .salon-surface-light .phd-pwd-input::placeholder {
    color: rgba(15, 23, 42, 0.45) !important;
  }
  .salon-surface-light [class*="text-white"] {
    color: rgba(15, 23, 42, 0.9) !important;
  }
  .salon-surface-light [style*="background: #ffffff0d"] {
    background: rgba(15, 23, 42, 0.08) !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .phd-logo, .phd-slide {
      animation: none !important;
      opacity: 1 !important;
      filter: none !important;
      transform: none !important;
    }
  }
`;

// ── Main component ────────────────────────────────────────────────────────────
export default function SalonLoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [phase, setPhase] = useState<Phase>("intro");
    const [animStep, setAnimStep] = useState(0);
    const [selected, setSelected] = useState<ProfileId | null>(null);
    const [entryPassword, setEntryPassword] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showEntryPwd, setShowEntryPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [surfaceMode, setSurfaceMode] = useState<"dark" | "light">("dark");
    const [venetian, setVenetian] = useState(true);
    const [avatarPx, setAvatarPx] = useState(() =>
        typeof window !== "undefined" ? calcAvatarPx(window.innerWidth, window.innerHeight) : 180,
    );
    const isLightSurface = surfaceMode === "light";

    // NÁPAD 1: mouse ref for LiquidGoldBg parallax
    const mouseRef = useRef<[number, number]>([0.5, 0.5]);

    const profile = PROFILES.find((p) => p.id === selected) ?? null;

    // Intro animation timeline
    useEffect(() => {
        const t1 = setTimeout(() => setAnimStep(1), 1300); // electric
        const t2 = setTimeout(() => setAnimStep(2), 2100); // button
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // NÁPAD 2: venetian blinds reveal on page load
    useEffect(() => {
        // 14 strips × 0.052s delay + 0.75s animation ≈ 1.48s total — add 220ms buffer
        const t = setTimeout(() => setVenetian(false), 1700);
        return () => clearTimeout(t);
    }, []);

    // NÁPAD 1: track mouse position (normalized 0–1) for LiquidGoldBg
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            mouseRef.current = [
                e.clientX / window.innerWidth,
                1.0 - e.clientY / window.innerHeight,
            ];
        };
        window.addEventListener("mousemove", onMove, { passive: true });
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    // Responsive avatar sizing
    useEffect(() => {
        const onResize = () => setAvatarPx(calcAvatarPx(window.innerWidth, window.innerHeight));
        window.addEventListener("resize", onResize, { passive: true });
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const enter = () => {
        setEntryPassword("");
        setShowEntryPwd(false);
        setPhase("gate");
    };
    const unlockProfiles = (e: React.FormEvent) => {
        e.preventDefault();
        if (!entryPassword) return;
        if (entryPassword !== ENTRY_PASSWORD) {
            toast.error(t("salonLogin.toastGateWrongPassword"));
            setEntryPassword("");
            return;
        }
        setEntryPassword("");
        setShowEntryPwd(false);
        setPhase("picker");
    };
    const pick = (id: ProfileId) => { setSelected(id); setPhase("login"); setPassword(""); };
    const goBack = () => { setSelected(null); setPhase("picker"); setPassword(""); };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !password) return;
        if (!profile.email) {
            toast.error(t("salonLogin.toastEmailMissing", { name: profile.label }));
            return;
        }
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, profile.email, password);
        } catch {
            toast.error(t("salonLogin.toastWrongPassword"));
            setPassword(""); setLoading(false);
            return;
        }
        toast.success(t("salonLogin.toastWelcome", { name: profile.label }));
        navigate("/admin/calendar");
    };

    return (
        <div
            className={`h-screen min-h-screen max-h-screen flex flex-col items-center overflow-hidden relative safe-y ${isLightSurface ? "salon-surface-light" : ""}`}
            style={{ background: isLightSurface ? "#f8fafc" : "#050505" }}
        >
            <style>{STYLES}</style>

            {/* Lightweight starry sky background */}
            <LiquidGoldBg mouseRef={mouseRef} enabled={!isLightSurface} />

            <div className="fixed top-4 right-4 z-[70] flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => setSurfaceMode((prev) => (prev === "dark" ? "light" : "dark"))}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 text-white/85 backdrop-blur-md transition hover:bg-white/20"
                    aria-label={isLightSurface ? "Prepnúť na tmavé pozadie" : "Prepnúť na svetlé pozadie"}
                    title={isLightSurface ? "Tmavé pozadie" : "Svetlé pozadie"}
                >
                    {isLightSurface ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>
                <LanguageToggle />
                <ThemeToggle />
            </div>

            {/* NÁPAD 2: Venetian blinds opening on page load */}
            <VenetianOverlay active={venetian} strips={14} />

            {/* ═══════════════════════════════════════════════════════════════
                ROW A — Logo zone
                ═══════════════════════════════════════════════════════════════ */}
            <div className="shrink-0 flex flex-col items-center select-none z-10 w-full pt-[15px] lg:pt-0 lg:-mt-[40px]">
                <img
                    src="https://papihairdesign.sk/images/logo-header.webp"
                    alt="Papi Hair Design"
                    draggable={false}
                    className={[
                        "phd-logo h-auto object-contain object-bottom",
                        "w-[75vw] xs:w-[74vw] sm:w-[66vw] md:w-[58vw] lg:w-[52vw] xl:w-[46vw] 2xl:w-[40vw]",
                        "max-w-[1200px] min-w-[280px]",
                        "-mb-8 xs:-mb-10 sm:-mb-12 md:-mb-14 lg:-mb-16 xl:-mb-20",
                    ].join(" ")}
                />
                <span className="relative z-10 text-[10px] xs:text-xs tracking-widest uppercase text-white/30">
                    Salon Management
                </span>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW B — Phase content
                ═══════════════════════════════════════════════════════════════ */}
            <div
                className={`flex-1 min-h-0 w-full flex flex-col items-center z-10 ${
                    phase === "picker"
                        ? "justify-start overflow-y-auto px-0 pb-4"
                        : "justify-center overflow-y-auto px-5 pb-7"
                }`}
            >

                {/* ──────────── INTRO ──────────── */}
                {phase === "intro" && (
                    <div className="w-full flex flex-col items-center">
                        {animStep >= 2 && (
                            <div
                                className="flex flex-col items-center gap-3 mt-5 sm:mt-7 w-full"
                                style={{
                                    opacity: 0,
                                    animation: "phd-up .75s .08s cubic-bezier(.22,1,.36,1) forwards",
                                }}
                            >
                                <button
                                    onClick={enter}
                                    className="w-full max-w-[280px] sm:max-w-xs py-[15px] rounded-2xl font-bold text-[12px] sm:text-[13px] tracking-[0.18em] uppercase overflow-hidden select-none min-h-[44px]"
                                    style={{
                                        background:
                                            "linear-gradient(270deg,#7A530E 0%,#C9A84C 22%,#F7E070 50%,#C9A84C 78%,#7A530E 100%)",
                                        backgroundSize: "300% 100%",
                                        animation:
                                            "phd-shimmer 2.8s linear infinite, phd-glow 2.5s ease-in-out infinite",
                                        color: "#1A0D00",
                                        textShadow: "0 1px 0 rgba(255,255,255,0.38)",
                                    }}
                                >
                                    {t("salonLogin.enterBtn")}
                                </button>

                                <p className="text-white/32 text-[10px] xs:text-[11px] tracking-[0.16em] uppercase mt-0.5">
                                    {t("salonLogin.passwordHint")}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ──────────── GATE ──────────── */}
                {phase === "gate" && (
                    <div
                        className="flex flex-col items-center gap-4 sm:gap-5 phd-slide w-full max-w-[300px] sm:max-w-sm"
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            border: "1px solid rgba(201,168,76,0.35)",
                            borderRadius: "24px",
                            padding: "28px 22px 24px",
                            boxShadow: "0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,76,0.12) inset",
                        }}
                    >
                        <button
                            onClick={() => setPhase("intro")}
                            className="self-start flex items-center gap-1 min-h-[44px] text-white/40 hover:text-white/70 text-sm transition-colors"
                        >
                            <ChevronLeft size={16} />
                            {t("salonLogin.back")}
                        </button>

                        <div className="flex flex-col items-center gap-1.5 text-center">
                            <h2 className="text-white text-lg sm:text-xl font-bold tracking-wide">
                                {t("salonLogin.gateTitle")}
                            </h2>
                            <p className="text-white/55 text-xs">
                                {t("salonLogin.gateHint")}
                            </p>
                        </div>

                        <form onSubmit={unlockProfiles} className="w-full flex flex-col gap-3">
                            <div
                                className="flex items-center rounded-xl overflow-hidden border transition-colors"
                                style={{
                                    background: "#ffffff0d",
                                    borderColor: "rgba(201,168,76,0.55)",
                                }}
                            >
                                <input
                                    type={showEntryPwd ? "text" : "password"}
                                    placeholder={t("salonLogin.gatePlaceholder")}
                                    autoFocus
                                    value={entryPassword}
                                    onChange={(e) => setEntryPassword(e.target.value)}
                                    className="flex-1 bg-transparent py-3 px-4 text-white outline-none text-sm phd-pwd-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEntryPwd((v) => !v)}
                                    className="px-4 min-h-[44px] flex items-center text-white/30 hover:text-white/60 transition-colors"
                                >
                                    {showEntryPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={!entryPassword}
                                className="w-full py-3 rounded-xl font-semibold text-sm tracking-widest uppercase transition-all duration-200 disabled:opacity-40 min-h-[44px]"
                                style={{
                                    background: entryPassword
                                        ? "linear-gradient(135deg, #C9A84C 0%, #E6C970 100%)"
                                        : "#ffffff11",
                                    color: entryPassword ? "#0d0d0d" : "#ffffff44",
                                    boxShadow: "0 8px 32px -4px rgba(201,168,76,0.5)",
                                }}
                            >
                                {t("salonLogin.gateButton")}
                            </button>
                        </form>
                    </div>
                )}

                {/* ──────────── PICKER ──────────── */}
                {phase === "picker" && (
                    <div className="phd-slide w-full flex flex-col">
                        <div className="w-full max-w-[560px] mx-auto px-4 sm:px-6 pt-0 -mt-1 sm:-mt-2">
                            <p
                                className="text-[11px] sm:text-xs text-center italic leading-relaxed"
                                style={{
                                    color: "rgba(201,168,76,0.62)",
                                    textShadow: "0 0 18px rgba(201,168,76,0.22)",
                                }}
                            >
                                {t("salonLogin.quote")}
                            </p>
                            <p className="mt-2 text-center text-[10px] sm:text-xs uppercase tracking-[0.16em] text-white/45">
                                Potiahnite nižšie a vyberte člena tímu
                            </p>
                        </div>

                        <div className="w-full max-w-[1120px] mx-auto mt-2 px-2 sm:px-4 pb-4 flex flex-row flex-nowrap items-start justify-center gap-2 sm:gap-3 md:gap-4 overflow-hidden">
                            {PROFILES.map((p) => (
                                <section key={p.id} className="flex items-start justify-center">
                                    <PickerCard
                                        p={p}
                                        avatarPx={Math.min(Math.max(Math.round(avatarPx * 0.44), 86), 170)}
                                        compact
                                        onPick={pick}
                                    />
                                </section>
                            ))}
                        </div>
                    </div>
                )}

                {/* ──────────── LOGIN ──────────── */}
                {phase === "login" && profile && (
                    <div
                        className="flex flex-col items-center gap-4 sm:gap-5 phd-slide w-full max-w-[300px] sm:max-w-sm"
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            border: `1px solid ${profile.color}30`,
                            borderRadius: "24px",
                            padding: "28px 22px 24px",
                            boxShadow: `0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px ${profile.color}14 inset`,
                        }}
                    >
                        <button
                            onClick={goBack}
                            className="self-start flex items-center gap-1 min-h-[44px] text-white/40 hover:text-white/70 text-sm transition-colors"
                        >
                            <ChevronLeft size={16} />
                            {t("salonLogin.back")}
                        </button>

                        <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                                boxShadow: `0 0 0 2px ${profile.color}, 0 0 44px ${profile.color}55`,
                            }}
                        >
                            <Avatar profile={profile} size={80} />
                        </div>

                        <div className="flex flex-col items-center gap-0.5">
                            <h2 className="text-white text-lg sm:text-xl font-bold tracking-wide">
                                {profile.label}
                            </h2>
                            <span
                                className="text-[10px] tracking-[0.14em] uppercase font-medium"
                                style={{ color: profile.color }}
                            >
                                {profile.role}
                            </span>
                        </div>

                        <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
                            <div
                                className="flex items-center rounded-xl overflow-hidden border transition-colors"
                                style={{
                                    background: "#ffffff0d",
                                    borderColor: `${profile.color}55`,
                                }}
                            >
                                <input
                                    type={showPwd ? "text" : "password"}
                                    placeholder={t("salonLogin.passwordPlaceholder")}
                                    autoFocus
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex-1 bg-transparent py-3 px-4 text-white outline-none text-sm phd-pwd-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd((v) => !v)}
                                    className="px-4 min-h-[44px] flex items-center text-white/30 hover:text-white/60 transition-colors"
                                >
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={!password || loading}
                                className="w-full py-3 rounded-xl font-semibold text-sm tracking-widest uppercase transition-all duration-200 disabled:opacity-40 min-h-[44px]"
                                style={{
                                    background: password
                                        ? `linear-gradient(135deg, ${profile.color} 0%, ${profile.color}99 100%)`
                                        : "#ffffff11",
                                    color: password ? "#0d0d0d" : "#ffffff44",
                                    boxShadow: `0 8px 32px -4px ${profile.color}40`,
                                }}
                            >
                                {loading ? "..." : t("salonLogin.loginBtn")}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* CSS gold particles */}
            {([
                { left: "8%", bottom: "25%", size: 2, dur: "12s", delay: "0s" },
                { left: "18%", bottom: "10%", size: 1, dur: "9s", delay: "2.5s" },
                { left: "32%", bottom: "32%", size: 2, dur: "15s", delay: "1s" },
                { left: "45%", bottom: "8%", size: 1, dur: "11s", delay: "3.5s" },
                { left: "58%", bottom: "20%", size: 2, dur: "13s", delay: "0.5s" },
                { left: "70%", bottom: "5%", size: 1, dur: "10s", delay: "4s" },
                { left: "82%", bottom: "28%", size: 2, dur: "14s", delay: "2s" },
                { left: "91%", bottom: "14%", size: 1, dur: "8s", delay: "6s" },
            ] as const).map((pt, i) => (
                <div
                    key={i}
                    aria-hidden="true"
                    className="pointer-events-none absolute"
                    style={{
                        left: pt.left,
                        bottom: pt.bottom,
                        width: pt.size,
                        height: pt.size,
                        borderRadius: "50%",
                        background: "#C9A84C",
                        boxShadow: `0 0 ${pt.size * 3}px #C9A84C99`,
                        animation: `phd-particle ${pt.dur} ${pt.delay} infinite ease-in-out`,
                        zIndex: 10,
                    }}
                />
            ))}

            {/* Copyright */}
            <div
                aria-hidden="true"
                className="absolute bottom-0 w-full text-center z-10 select-none pointer-events-none"
                style={{
                    paddingBottom: "max(6px, env(safe-area-inset-bottom))",
                    color: "rgba(255,255,255,0.11)",
                    fontSize: "9px",
                    letterSpacing: "0.14em",
                }}
            >
                © {new Date().getFullYear()} PAPI HAIR DESIGN. ALL RIGHTS RESERVED.
            </div>
        </div>
    );
}
