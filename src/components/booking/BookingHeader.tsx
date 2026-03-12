import { LanguageToggle } from "@/components/LanguageToggle";
import { Moon, Sun } from "lucide-react";
import { GoldText } from "./BookingUI";

interface BookingHeaderProps {
    isDark: boolean;
    setTheme: (theme: string) => void;
}

export function BookingHeader({ isDark, setTheme }: BookingHeaderProps) {
    return (
        <header
            className="sticky top-0 z-50 safe-x flex flex-col border-b border-border/60 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top)]"
            style={{ background: "linear-gradient(180deg, hsl(var(--baby-blue)) 0%, rgba(255,255,255,0.95) 65%)" }}
        >
            {/* Gold accent strip */}
            <div
                className="h-0.5 w-full opacity-80"
                style={{ background: "linear-gradient(90deg, transparent, hsl(var(--baby-blue)) 55%, transparent)" }}
            />
            <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                    <img
                        src="/favicon.png"
                        alt="PAPI HAIR DESIGN"
                        className="w-6 h-6 object-contain shrink-0"
                    />
                    <div className="flex flex-col leading-none">
                        <span className="text-[15px] font-bold tracking-widest uppercase font-serif">
                            PAPI <GoldText>HAIR</GoldText> DESIGN
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em] font-semibold">papihairdesign.sk</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <LanguageToggle />
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        aria-label="Toggle theme"
                        className="w-9 h-9 rounded-full border border-border/60 bg-card flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 active:scale-90"
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
