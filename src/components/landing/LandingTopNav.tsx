import { useNavigate } from "react-router-dom";

interface LandingTopNavProps {
  onOpenPrice: () => void;
}

const navButtons = [
  {
    label: "Domov",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    type: "static" as const,
  },
  {
    label: "Strih",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" x2="8.12" y1="4" y2="15.88" />
        <line x1="14.47" x2="20" y1="14.48" y2="20" />
        <line x1="8.12" x2="12" y1="8.12" y2="12" />
      </svg>
    ),
    type: "static" as const,
  },
  {
    label: "Cenník",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
    type: "price" as const,
  },
  {
    label: "Rezervácia",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
        <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
        <path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
      </svg>
    ),
    type: "booking" as const,
  },
  {
    label: "Telefón",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    type: "phone" as const,
    href: "tel:+421949459624",
  },
];

export function LandingTopNav({ onOpenPrice }: LandingTopNavProps) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Hlavná navigácia"
      className="relative mb-4 mt-0 flex w-full max-w-[600px] items-center justify-center md:mb-6"
    >
      <div
        className="absolute left-4 right-4 top-1/2 -z-10 h-[1px] bg-gold/30"
        style={{ boxShadow: "var(--shadow-nav-line)" }}
        aria-hidden="true"
      />

      <div className="flex w-full items-center justify-between gap-2 px-1 md:gap-4 md:px-2">
        {navButtons.map((button) => {
          const interactive = button.type !== "static";
          const className = interactive
            ? "group cursor-pointer rounded-full border border-gold/40 bg-gradient-to-b from-bg-surface to-ink-200 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 md:p-3.5"
            : "cursor-default rounded-full border border-gold/15 bg-gradient-to-b from-bg-surface/70 to-ink-200/70 p-3 opacity-65 md:p-3.5";
          const style = interactive ? { boxShadow: "var(--shadow-nav-btn)" } : undefined;

          const inner = (
            <span className={interactive ? "flex text-gold transition-all group-hover:drop-shadow-[0_0_5px_rgba(220,183,115,0.40)]" : "flex text-gold/45"}>
              {button.icon}
            </span>
          );

          if (button.type === "phone") {
            return (
              <a key={button.label} href={button.href} aria-label={button.label} className={className} style={style}>
                {inner}
              </a>
            );
          }

          if (button.type === "booking") {
            return (
              <button
                key={button.label}
                aria-label={button.label}
                className={className}
                style={style}
                onClick={() => navigate("/booking")}
                type="button"
              >
                {inner}
              </button>
            );
          }

          if (button.type === "price") {
            return (
              <button
                key={button.label}
                aria-label={button.label}
                className={className}
                style={style}
                onClick={onOpenPrice}
                type="button"
              >
                {inner}
              </button>
            );
          }

          return (
            <div key={button.label} aria-label={button.label} className={className} style={style}>
              {inner}
            </div>
          );
        })}

        <div
          aria-label="Jazyk: Slovenčina"
          className="flex cursor-default items-center space-x-2 rounded-full border border-gold/15 bg-gradient-to-b from-bg-surface/70 to-ink-200/70 px-3 py-2 opacity-65 md:px-4"
        >
          <div
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/20"
            style={{ background: "linear-gradient(to bottom, white 33%, #0B4FD1 33% 66%, #D7000A 66%)" }}
            aria-hidden="true"
          />
          <span className="text-[12px] font-bold tracking-wide text-gold/55 md:text-[13px]">
            SK
          </span>
        </div>
      </div>
    </nav>
  );
}
