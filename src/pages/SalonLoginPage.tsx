import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ChevronLeft, Scissors } from "lucide-react";


// ── Profile definitions ────────────────────────────────────────────────────────
const PROFILES = [
    {
        id: "papi",
        label: "Papi",
        email: import.meta.env.VITE_PAPI_EMAIL ?? "",
        color: "#C9A84C",
        photo: "/papi.webp",

        initials: "P",
    },
    {
        id: "miska",
        label: "Miska",
        email: import.meta.env.VITE_MISKA_EMAIL ?? "",
        color: "#8B5CF6",
        photo: "/miska.webp",

        initials: "M",
    },
    {
        id: "mato",
        label: "Mato",
        email: import.meta.env.VITE_MATO_EMAIL ?? "",
        color: "#3B82F6",
        photo: "/mato.webp",

        initials: "M",
    },
] as const;

type ProfileId = (typeof PROFILES)[number]["id"];

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function SalonLoginPage() {
    const navigate = useNavigate();
    const [selected, setSelected] = useState<ProfileId | null>(null);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const selectedProfile = PROFILES.find((p) => p.id === selected) ?? null;

    const handleSelect = (id: ProfileId) => {
        setSelected(id);
        setPassword("");
    };

    const handleBack = () => {
        setSelected(null);
        setPassword("");
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfile || !password) return;

        if (!selectedProfile.email) {
            toast.error(`Email pre ${selectedProfile.label} nie je nakonfigurovaný. Nastav VITE_${selectedProfile.id.toUpperCase()}_EMAIL v .env`);
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: selectedProfile.email,
            password,
        });

        if (error) {
            toast.error("Nesprávne heslo. Skús znova.");
            setPassword("");
            setLoading(false);
            return;
        }

        toast.success(`Vitaj, ${selectedProfile.label}! 👋`);
        navigate("/admin/calendar");
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
            style={{
                background:
                    "radial-gradient(ellipse 120% 80% at 50% 0%, #1a0a00 0%, #0d0d0d 55%, #050505 100%)",
            }}
        >
            {/* Ambient glow */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 40% at 50% -10%, #C9A84C18 0%, transparent 70%)",
                }}
            />

            {/* Logo / branding */}
            <div className="relative z-10 mb-12 flex flex-col items-center gap-2 select-none">
                <div className="flex items-center gap-3">
                    <Scissors className="text-primary w-6 h-6" style={{ color: "#C9A84C" }} />
                    <span
                        className="text-3xl font-bold tracking-widest uppercase font-serif"
                        style={{ letterSpacing: "0.25em" }}
                    >
                        <span style={{ color: "#C9A84C" }}>PAPI</span>
                        <span className="text-white"> HAIR DESIGN</span>
                    </span>
                    <Scissors
                        className="text-primary w-6 h-6 rotate-180"
                        style={{ color: "#C9A84C" }}
                    />
                </div>
                <span className="text-xs tracking-widest uppercase text-white/30">
                    Salon Management
                </span>
            </div>

            {/* ── PICKER STATE ── */}
            {!selected && (
                <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
                    <h2 className="text-white/60 text-sm tracking-widest uppercase">
                        Kto si?
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                        {PROFILES.map((profile) => (
                            <button
                                key={profile.id}
                                onClick={() => handleSelect(profile.id)}
                                className="group flex flex-col items-center gap-4 focus:outline-none"
                            >
                                {/* Card */}
                                <div
                                    className="relative rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl"
                                    style={{
                                        boxShadow: `0 0 0 2px transparent`,
                                        transition: "box-shadow 0.3s, transform 0.3s",
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 2px ${profile.color}, 0 0 40px ${profile.color}44`;
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLDivElement).style.boxShadow =
                                            "0 0 0 2px transparent";
                                    }}
                                >
                                    <Avatar profile={profile} size={140} />
                                    {/* Subtle overlay on hover */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{
                                            background: `linear-gradient(to top, ${profile.color}33 0%, transparent 60%)`,
                                        }}
                                    />
                                </div>
                                {/* Name */}
                                <span
                                    className="text-white/70 group-hover:text-white text-base font-semibold tracking-wider transition-colors duration-200"
                                    style={{ fontFamily: "sans-serif" }}
                                >
                                    {profile.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── LOGIN STATE ── */}
            {selected && selectedProfile && (
                <div
                    className="relative z-10 flex flex-col items-center gap-6 animate-fade-in w-full max-w-sm px-4"
                >
                    {/* Back button */}
                    <button
                        onClick={handleBack}
                        className="self-start flex items-center gap-1 text-white/40 hover:text-white/70 text-sm transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Späť
                    </button>

                    {/* Selected avatar */}
                    <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                            boxShadow: `0 0 0 2px ${selectedProfile.color}, 0 0 50px ${selectedProfile.color}55`,
                        }}
                    >
                        <Avatar profile={selectedProfile} size={96} />
                    </div>

                    <h2 className="text-white text-xl font-bold tracking-wide">
                        {selectedProfile.label}
                    </h2>

                    {/* Password form */}
                    <form
                        onSubmit={handleLogin}
                        className="w-full flex flex-col gap-4"
                    >
                        <div
                            className="flex items-center rounded-xl overflow-hidden border transition-colors"
                            style={{
                                background: "#ffffff0d",
                                borderColor: `${selectedProfile.color}55`,
                            }}
                        >
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Heslo"
                                autoFocus
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex-1 bg-transparent py-3 px-4 text-white placeholder:text-white/30 outline-none text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="px-4 text-white/30 hover:text-white/60 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={!password || loading}
                            className="w-full py-3 rounded-xl font-semibold text-sm tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
                            style={{
                                background: password
                                    ? `linear-gradient(135deg, ${selectedProfile.color} 0%, ${selectedProfile.color}99 100%)`
                                    : "#ffffff11",
                                color: password ? "#0d0d0d" : "#ffffff44",
                                boxShadow: password
                                    ? `0 4px 24px ${selectedProfile.color}44`
                                    : "none",
                            }}
                        >
                            {loading ? "Prihlasovanie…" : "Prihlásiť sa"}
                        </button>
                    </form>
                </div>
            )}

            {/* Bottom label */}
            <div className="absolute bottom-6 text-white/15 text-xs tracking-widest select-none z-10">
                © {new Date().getFullYear()} Papi Hair Design
            </div>
        </div>
    );
}
