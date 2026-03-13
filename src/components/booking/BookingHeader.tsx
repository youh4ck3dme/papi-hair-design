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
        >
            {/* Gold accent strip */}
            <div
                className="h-0.5 w-full opacity-80"
                style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)) 55%, transparent)" }}
            />
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                    <img
                        src="/favicon.png"
                        alt="PAPI HAIR DESIGN"
                        className="w-6 h-6 object-contain shrink-0"
                    />
                    <div className="flex flex-col leading-none">
                        <span className="text-[14px] font-bold tracking-widest uppercase font-serif sm:text-[15px]">
                            PAPI <GoldText>HAIR</GoldText> DESIGN
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">papihairdesign.sk</span>
                    </div>
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
