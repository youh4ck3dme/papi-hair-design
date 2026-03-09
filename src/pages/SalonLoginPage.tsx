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
type Phase = "intro" | "picker" | "login";

// ── Responsive avatar size ───────────────────────────────────────────────────
function calcAvatarPx(w: number): number {
    if (w < 375) return 88;
    if (w < 640) return 108;
    if (w < 1024) return 138;
    return 178;
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

// ── WebGL shaders: thin electric divider (intro phase) ───────────────────────
const VS_SRC = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;
const FS_SRC = `
  precision mediump float;
  uniform float u_time;
  uniform vec2  u_res;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),               hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p  = p * 2.1 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    float aspect = u_res.x / u_res.y;
    float t = u_time * 0.9;
    vec2 p = (uv * 2.0 - 1.0) * vec2(aspect, 1.0);

    float n1 = fbm(p * 2.2 + vec2( t * 0.55,  0.10));
    float n2 = fbm(p * 3.8 + vec2(-t * 0.38,  t * 0.28));
    float n3 = fbm(p * 7.5 + vec2( t * 0.92, -t * 0.22));

    float cy = uv.y - 0.5;
    float b1 = 1.0 / (1.0 + 55.0  * (cy + n1 * 0.75)        * (cy + n1 * 0.75));
    float b2 = 1.0 / (1.0 + 95.0  * (cy + n2 * 0.55 + 0.08) * (cy + n2 * 0.55 + 0.08));
    float b3 = 1.0 / (1.0 + 170.0 * (cy + n3 * 0.28 - 0.04) * (cy + n3 * 0.28 - 0.04));
    float bolts = b1 * 0.85 + b2 * 0.65 + b3 * 1.05;

    float sp1 = pow(noise(p * 26.0 + vec2(t * 3.1, 0.0)),    9.0) * 0.55;
    float sp2 = pow(noise(p * 19.0 - vec2(0.0, t * 2.6)),   11.0) * 0.35;
    float intensity = bolts + sp1 + sp2;

    vec3 c = vec3(0.04, 0.028, 0.008);
    c = mix(c, vec3(0.788, 0.659, 0.298), smoothstep(0.00, 0.35, intensity));
    c = mix(c, vec3(1.00,  0.900, 0.640), smoothstep(0.25, 0.60, intensity));
    c = mix(c, vec3(1.00,  0.970, 0.880), smoothstep(0.50, 0.80, intensity));
    c = mix(c, vec3(1.00,  1.000, 1.000), smoothstep(0.75, 1.00, intensity));

    float vx = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x);
    c *= (0.45 + 0.55 * vx);
    gl_FragColor = vec4(c, smoothstep(0.04, 0.22, intensity) * vx);
  }
`;

// ── NÁPAD 1: WebGL shaders — full-screen Liquid Gold background ──────────────
const BG_FS_SRC = `
  precision mediump float;
  uniform float u_time;
  uniform vec2  u_res;
  uniform vec2  u_mouse;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p  = p * 2.1 + vec2(1.7, 9.2);
      a *= 0.52;
    }
    return v;
  }
  void main() {
    vec2 uv  = gl_FragCoord.xy / u_res;
    float t  = u_time * 0.14;
    vec2 mp  = (u_mouse - 0.5) * 0.05;
    vec2 p   = uv + mp;

    float f1 = fbm(p * 1.6 + vec2(t * 0.85, t * 0.55));
    float f2 = fbm(p * 2.9 - vec2(t * 0.52, t * 0.92));
    float f3 = fbm(p * 0.85 + vec2(-t * 0.28, t * 0.18));
    float flow = f1 * 0.44 + f2 * 0.36 + f3 * 0.20;

    vec3 c0 = vec3(0.030, 0.014, 0.003);
    vec3 c1 = vec3(0.220, 0.110, 0.020);
    vec3 c2 = vec3(0.788, 0.659, 0.298);
    vec3 c3 = vec3(0.969, 0.878, 0.439);

    vec3 col = c0;
    col = mix(col, c1, smoothstep(0.28, 0.50, flow));
    col = mix(col, c2, smoothstep(0.48, 0.68, flow));
    col = mix(col, c3, smoothstep(0.66, 0.82, flow));

    vec2 vd  = uv - 0.5;
    float vig = 1.0 - dot(vd * 1.5, vd * 1.5);
    col *= max(0.22, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── NÁPAD 1: LiquidGoldBg — full-screen animated background ──────────────────
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
        if (document.documentElement.classList.contains("phd-low-power")) return;
        const canvas = ref.current;
        if (!canvas) return;

        const gl = (
            canvas.getContext("webgl") ??
            (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
        ) as WebGLRenderingContext | null;
        if (!gl) return;

        const sync = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        };
        sync();
        window.addEventListener("resize", sync, { passive: true });

        const mkShader = (type: number, src: string) => {
            const s = gl.createShader(type);
            if (!s) return null;
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return s;
        };
        const vs = mkShader(gl.VERTEX_SHADER, VS_SRC);
        const fs = mkShader(gl.FRAGMENT_SHADER, BG_FS_SRC);
        if (!vs || !fs) { window.removeEventListener("resize", sync); return; }

        const prog = gl.createProgram();
        if (!prog) { window.removeEventListener("resize", sync); return; }
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW,
        );
        const posLoc = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const tLoc = gl.getUniformLocation(prog, "u_time");
        const rLoc = gl.getUniformLocation(prog, "u_res");
        const mouseLoc = gl.getUniformLocation(prog, "u_mouse");

        gl.clearColor(0.03, 0.014, 0.003, 1);

        const isMobile = window.innerWidth < 768;
        const minInterval = isMobile ? 1000 / 30 : 1000 / 60;
        let last = 0;
        let raf = 0;
        const t0 = performance.now();

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            if (now - last < minInterval) return;
            last = now;
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1f(tLoc, (now - t0) / 1000);
            gl.uniform2f(rLoc, canvas.width, canvas.height);
            const m = mouseRef.current;
            gl.uniform2f(mouseLoc, m ? m[0] : 0.5, m ? m[1] : 0.5);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", sync);
            gl.deleteProgram(prog);
            if (buf) gl.deleteBuffer(buf);
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

// ── WebGL Electric Canvas (intro divider) ────────────────────────────────────
function ElectricCanvas() {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (document.documentElement.classList.contains("phd-low-power")) return;
        const canvas = ref.current;
        if (!canvas) return;

        const gl = (
            canvas.getContext("webgl") ??
            (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
        ) as WebGLRenderingContext | null;
        if (!gl) return;

        const sync = () => {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            if (!w || !h) return;
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
        };
        sync();
        const ro = new ResizeObserver(sync);
        ro.observe(canvas);

        const mkShader = (type: number, src: string) => {
            const s = gl.createShader(type);
            if (!s) return null;
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return s;
        };
        const vs = mkShader(gl.VERTEX_SHADER, VS_SRC);
        const fs = mkShader(gl.FRAGMENT_SHADER, FS_SRC);
        if (!vs || !fs) { ro.disconnect(); return; }

        const prog = gl.createProgram();
        if (!prog) { ro.disconnect(); return; }
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const tLoc = gl.getUniformLocation(prog, "u_time");
        const rLoc = gl.getUniformLocation(prog, "u_res");
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);

        let raf = 0;
        const t0 = performance.now();
        const frame = () => {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1f(tLoc, (performance.now() - t0) / 1000);
            gl.uniform2f(rLoc, canvas.width, canvas.height);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            raf = requestAnimationFrame(frame);
        };
        frame();

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            gl.deleteProgram(prog);
            if (buf) gl.deleteBuffer(buf);
        };
    }, []);

    return <canvas ref={ref} aria-hidden="true" className="block w-full h-12 sm:h-16 lg:h-20" />;
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
    onPick,
}: {
    p: (typeof PROFILES)[number];
    avatarPx: number;
    onPick: (id: ProfileId) => void;
}) {
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);

    const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
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
                borderRadius: "1.6rem",
                padding: "12px 12px 16px",
                background: hovered
                    ? `rgba(255,255,255,0.07)`
                    : "rgba(255,255,255,0.04)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: `1px solid ${hovered ? p.color + "60" : p.color + "28"}`,
                boxShadow: hovered
                    ? `0 20px 56px rgba(0,0,0,0.6), 0 0 40px ${p.color}28, inset 0 1px 0 ${p.color}28`
                    : `0 8px 28px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.07)`,
                transform: `perspective(650px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(${hovered ? 1.06 : 1}) translateY(${hovered ? -5 : 0}px)`,
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
                className="text-xs sm:text-sm lg:text-base font-bold tracking-wider transition-colors duration-200"
                style={{ color: hovered ? "#ffffff" : "rgba(255,255,255,0.92)" }}
            >
                {p.label}
            </span>

            {/* Role label — new */}
            <span
                className="text-[9px] sm:text-[10px] font-medium tracking-[0.14em] uppercase transition-colors duration-300"
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
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [surfaceMode, setSurfaceMode] = useState<"dark" | "light">("dark");
    const [venetian, setVenetian] = useState(true);
    const [avatarPx, setAvatarPx] = useState(() =>
        typeof window !== "undefined" ? calcAvatarPx(window.innerWidth) : 138,
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
        const onResize = () => setAvatarPx(calcAvatarPx(window.innerWidth));
        window.addEventListener("resize", onResize, { passive: true });
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const enter = () => setPhase("picker");
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
            className={`h-[100dvh] flex flex-col items-center overflow-hidden relative safe-y ${isLightSurface ? "salon-surface-light" : ""}`}
            style={{ background: isLightSurface ? "#f8fafc" : "#050505" }}
        >
            <style>{STYLES}</style>

            {/* NÁPAD 1: Full-screen Liquid Gold WebGL background */}
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
            <div className="shrink-0 flex flex-col items-center select-none z-10 w-full pt-3 xs:pt-4 sm:pt-5">
                <img
                    src="https://papihairdesign.sk/images/logo-header.webp"
                    alt="Papi Hair Design"
                    draggable={false}
                    className={[
                        "phd-logo w-auto object-contain object-bottom",
                        "h-32 xs:h-36 sm:h-44 md:h-52 lg:h-64 xl:h-72",
                        "-mb-6 xs:-mb-7 sm:-mb-9 md:-mb-10 lg:-mb-14 xl:-mb-16",
                    ].join(" ")}
                />
                <span className="relative z-10 text-[10px] xs:text-xs tracking-widest uppercase text-white/30">
                    Salon Management
                </span>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW B — Phase content
                ═══════════════════════════════════════════════════════════════ */}
            <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-y-auto px-5 pb-7 z-10">

                {/* ──────────── INTRO ──────────── */}
                {phase === "intro" && (
                    <div className="w-full flex flex-col items-center">

                        {animStep >= 1 && (
                            <div
                                className="w-full"
                                style={{
                                    opacity: 0,
                                    animation: "phd-up .9s cubic-bezier(.22,1,.36,1) forwards",
                                    filter: "drop-shadow(0 0 16px #C9A84C55)",
                                }}
                            >
                                <ElectricCanvas />
                            </div>
                        )}

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

                {/* ──────────── PICKER ──────────── */}
                {phase === "picker" && (
                    <div className="flex flex-col items-center gap-4 sm:gap-6 phd-slide w-full">

                        <p
                            className="text-[11px] sm:text-xs text-center italic max-w-[260px] sm:max-w-xs leading-relaxed px-2"
                            style={{
                                color: "rgba(201,168,76,0.62)",
                                textShadow: "0 0 18px rgba(201,168,76,0.22)",
                            }}
                        >
                            {t("salonLogin.quote")}
                        </p>

                        {/* NÁPAD 3: Holographic 3D tilt member cards */}
                        <div className="flex flex-row gap-4 xs:gap-5 sm:gap-9 lg:gap-12 mt-1">
                            {PROFILES.map((p) => (
                                <PickerCard
                                    key={p.id}
                                    p={p}
                                    avatarPx={avatarPx}
                                    onPick={pick}
                                />
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
