import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/liquid-glass-nav.css";

type ToastState = "hidden" | "visible" | "leaving";

export interface LiquidGlassNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface LiquidGlassNavProps {
  items?: LiquidGlassNavItem[];
  activeId?: string;
  onSelect?: (item: LiquidGlassNavItem) => void;
  className?: string;
  showToast?: boolean;
  toastPrefix?: string;
}

const DEFAULT_TOAST_DURATION_MS = 2400;

export function LiquidGlassNav({
  items = [],
  activeId,
  onSelect,
  className,
  showToast = false,
  toastPrefix = "Otvorili ste:",
}: Readonly<LiquidGlassNavProps>) {
  const [toastState, setToastState] = useState<ToastState>("hidden");
  const [toastMessage, setToastMessage] = useState("");
  const [toastKey, setToastKey] = useState(0);

  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToastTimers = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const handleItemClick = (item: LiquidGlassNavItem) => {
    onSelect?.(item);
    if (!showToast) return;

    setToastMessage(`${toastPrefix} ${item.label}`);
    setToastKey((prev) => prev + 1);
    setToastState("visible");
    clearToastTimers();

    leaveTimeoutRef.current = setTimeout(() => {
      setToastState("leaving");
      hideTimeoutRef.current = setTimeout(() => {
        setToastState("hidden");
      }, 280);
    }, DEFAULT_TOAST_DURATION_MS);
  };

  useEffect(() => () => clearToastTimers(), []);

  return (
    <div
      className={cn("relative w-full font-sans", className)}
      style={{ "--liquid-nav-duration": `${DEFAULT_TOAST_DURATION_MS}ms` } as CSSProperties}
    >
      <nav className="space-y-2 rounded-2xl border border-white/15 bg-white/[0.08] p-3 shadow-xl backdrop-blur-xl">
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              className={cn(
                "group flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.99]",
                isActive
                  ? "bg-white/20 text-white shadow-md"
                  : "text-white/85 hover:scale-[1.015] hover:bg-white/15 hover:text-white hover:shadow-lg"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />}
              <span className="truncate text-sm font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {showToast && toastState !== "hidden" && (
        <div
          key={toastKey}
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-3 shadow-xl backdrop-blur-xl",
            toastState === "leaving" ? "liquid-nav-toast-leave" : "liquid-nav-toast-enter"
          )}
          role="status"
          aria-live="polite"
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className="liquid-nav-badge flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Check className="h-4 w-4 text-white" strokeWidth={3} />
            </div>
            <span className="liquid-nav-text text-sm font-medium text-white">{toastMessage}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div className="liquid-nav-progress h-full bg-white/30" />
          </div>
        </div>
      )}
    </div>
  );
}
