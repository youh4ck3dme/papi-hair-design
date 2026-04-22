import { CircleDollarSign, House, Phone, Scissors, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

type PublicHeaderSection = "home" | "services" | "pricing" | "account" | null;

interface PublicStickyHeaderProps {
  onPriceAction?: () => void;
  currentOverride?: PublicHeaderSection;
  className?: string;
}

type NavigationButton = {
  key: Exclude<PublicHeaderSection, null> | "phone";
  label: string;
  icon: typeof House;
  action: "navigate" | "price" | "phone";
  href?: string;
  target?: PublicHeaderSection;
};

const navigationButtons: NavigationButton[] = [
  { key: "home", label: "Domov", icon: House, action: "navigate", target: "home" },
  { key: "services", label: "Služby", icon: Scissors, action: "navigate", target: "services" },
  { key: "pricing", label: "Cenník", icon: CircleDollarSign, action: "price", target: "pricing" },
  { key: "account", label: "Môj účet", icon: UserRound, action: "navigate", target: "account" },
  { key: "phone", label: "Telefón", icon: Phone, action: "phone", href: "tel:+421949459624" },
];

function resolveSection(pathname: string): PublicHeaderSection {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/demo")) return "home";
  if (pathname.startsWith("/booking")) return "services";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (
    pathname.startsWith("/my-account") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/dashboard/history") ||
    pathname.startsWith("/papihairsalon2026")
  ) {
    return "account";
  }
  if (pathname.startsWith("/privacy") || pathname.startsWith("/terms") || pathname.startsWith("/install")) {
    return "pricing";
  }
  return null;
}

function resolveTargetPath(section: Exclude<PublicHeaderSection, null>): string {
  switch (section) {
    case "home":
      return "/";
    case "services":
      return "/booking";
    case "pricing":
      return "/pricing";
    case "account":
      return "/my-account";
  }
}

function buildLanguageBadgeStyle(isEnglish: boolean): string {
  if (isEnglish) {
    return "linear-gradient(135deg, #0A3D91 0%, #0A3D91 45%, #FFFFFF 45%, #FFFFFF 55%, #C8102E 55%, #C8102E 100%)";
  }

  return "linear-gradient(to bottom, #FFFFFF 33%, #0B4FD1 33% 66%, #D7000A 66%)";
}

export function PublicStickyHeader({
  onPriceAction,
  currentOverride,
  className,
}: PublicStickyHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  const isEnglish = i18n.language === "en";
  const activeSection = currentOverride ?? resolveSection(location.pathname);

  const handleLanguageToggle = () => {
    const nextLanguage = isEnglish ? "sk" : "en";
    i18n.changeLanguage(nextLanguage);
    localStorage.setItem("lang", nextLanguage);
  };

  const handleButtonClick = (button: NavigationButton) => {
    if (button.action === "phone" || !button.target) return;
    if (button.action === "price" && onPriceAction) {
      onPriceAction();
      return;
    }

    navigate(resolveTargetPath(button.target));
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-[70] w-full px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-6",
        className,
      )}
    >
      <div
        className="mx-auto w-full max-w-[780px] rounded-[30px] border border-gold/10 bg-[linear-gradient(180deg,rgba(9,8,7,0.94),rgba(18,13,9,0.92))] px-3.5 py-3 shadow-[0_26px_58px_-38px_rgba(0,0,0,0.95)] backdrop-blur-xl"
        data-testid="public-sticky-header"
      >
        <div className="relative flex items-center justify-between gap-2.5 sm:gap-3">
          <div
            className="pointer-events-none absolute left-3 right-20 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-gold/0 via-gold/35 to-gold/0 sm:block"
            aria-hidden="true"
          />

          <div className="relative z-10 flex min-w-0 flex-1 items-center justify-between gap-2">
            {navigationButtons.map((button) => {
              const Icon = button.icon;
              const isActive = button.target ? activeSection === button.target : false;
              const commonClassName = cn(
                "group relative inline-flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border transition-all duration-200 active:scale-95",
                isActive
                  ? "border-gold/70 bg-gold/[0.12] text-gold shadow-[0_0_0_1px_rgba(220,183,115,0.35),0_0_24px_rgba(220,183,115,0.10)]"
                  : "border-gold/25 bg-black/35 text-gold/80 hover:border-gold/55 hover:bg-gold/[0.08] hover:text-gold",
              );

              if (button.action === "phone" && button.href) {
                return (
                  <a
                    key={button.key}
                    href={button.href}
                    aria-label={button.label}
                    className={commonClassName}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                  </a>
                );
              }

              return (
                <button
                  key={button.key}
                  type="button"
                  aria-label={button.label}
                  className={commonClassName}
                  onClick={() => handleButtonClick(button)}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="Switch language / Zmeniť jazyk"
            onClick={handleLanguageToggle}
            className="relative z-10 inline-flex min-h-[48px] min-w-[72px] items-center gap-2 rounded-full border border-gold/25 bg-black/35 px-3 py-2 text-gold transition-all duration-200 hover:border-gold/55 hover:bg-gold/[0.08] active:scale-95"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/25"
              style={{ background: buildLanguageBadgeStyle(isEnglish) }}
              aria-hidden="true"
            />
            <span className="text-xs font-black uppercase tracking-[0.16em] text-gold/90">
              {isEnglish ? "EN" : "SK"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
