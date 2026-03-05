import { LanguageToggle } from "@/components/LanguageToggle";
import { Moon, Sun } from "lucide-react";
import { GoldText } from "./BookingUI";

interface BookingHeaderProps {
    isDark: boolean;
    setTheme: (theme: string) => void;
}

export function BookingHeader({ isDark, setTheme }: BookingHeaderProps) {
    return (
        <header className="sticky top-0 z-50 px-4 py-3 safe-x flex items-center justify-between bg-background/90 border-b border-border backdrop-blur-sm pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex flex-col">
                <span className="text-lg font-bold tracking-widest uppercase font-serif">
                    PAPI <GoldText>HAIR</GoldText> DESIGN
                </span>
                <span className="text-xs text-white/70 uppercase tracking-widest font-bold">papihairdesign.sk</span>
            </div>
            <div className="flex items-center gap-4">
                <LanguageToggle />
                <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="p-2 rounded-full hover:bg-accent transition-colors"
                >
                    {isDark ? <Sun size={20} className="text-primary" /> : <Moon size={20} className="text-foreground" />}
                </button>
            </div>
        </header>
    );
}
