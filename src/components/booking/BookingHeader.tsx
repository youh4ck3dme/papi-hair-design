import { LanguageToggle } from "@/components/LanguageToggle";
import { Moon, Sun, ChevronLeft } from "lucide-react";
import { GoldText } from "./BookingUI";
import { useNavigate } from "react-router-dom";

interface BookingHeaderProps {
    isDark: boolean;
    setTheme: (theme: string) => void;
}

export function BookingHeader({ isDark, setTheme }: BookingHeaderProps) {
    const navigate = useNavigate();
    return (
        <header
            className="sticky top-0 z-50 safe-x flex flex-col border-b border-border/60 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top)]"
        >
            {/* Gold accent strip */}
            <div
                className="h-0.5 w-full opacity-80"
                style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)) 55%, transparent)" }}
            />
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => navigate(-1)}
                        aria-label="Späť"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-90 shrink-0"
                    >
                        <ChevronLeft size={18} className="text-foreground/70" />
                    </button>
                    <img src="/favicon-32x32.png" alt="PAPI HAIR DESIGN" className="w-7 h-7 rounded-full object-cover shrink-0" />
                    <span className="text-[14px] font-bold tracking-widest uppercase font-serif sm:text-[15px]">
                        PAPI <GoldText>HAIR</GoldText> DESIGN
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <LanguageToggle />
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        aria-label="Toggle theme"
                        className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border/60 bg-card transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 active:scale-90"
                    >
                        <span className="transition-transform duration-300" style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(-30deg)' }}>
                            {isDark ? <Sun size={17} className="text-primary" /> : <Moon size={17} className="text-foreground/80" />}
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
}
