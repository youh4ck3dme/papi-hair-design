import { useEffect, useRef } from "react";

interface LandingSplashScreenProps {
  onFinish: () => void;
}

export function LandingSplashScreen({ onFinish }: LandingSplashScreenProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const t1 = window.setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.width = "100%";
      }
    }, 100);

    const t2 = window.setTimeout(() => {
      titleRef.current?.classList.add("animate-fade-in-up");
      titleRef.current?.classList.remove("opacity-0");
    }, 400);

    const t3 = window.setTimeout(() => {
      subtitleRef.current?.classList.add("animate-fade-in-up");
      subtitleRef.current?.classList.remove("opacity-0");
    }, 900);

    const t4 = window.setTimeout(() => {
      onFinish();
    }, 2700);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-bg-void">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at center, rgba(220,183,115,0.12) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="relative mb-10 mt-[-5vh] flex items-center justify-center">
        <div
          className="absolute h-[260px] w-[260px] animate-spin-reverse-slow rounded-full border border-dashed border-gold/20 md:h-[320px] md:w-[320px]"
          aria-hidden="true"
        />

        <div
          className="absolute h-[220px] w-[220px] animate-spin-medium rounded-full border border-gold/10 md:h-[270px] md:w-[270px]"
          aria-hidden="true"
        >
          <div
            className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold"
            style={{ boxShadow: "0 0 10px var(--color-gold), 0 0 20px var(--color-gold)" }}
          />
          <div className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 translate-y-1/2 rounded-full bg-gold/50" />
        </div>

        <div
          className="absolute h-[185px] w-[185px] rounded-full border border-gold/30 md:h-[215px] md:w-[215px]"
          style={{ boxShadow: "inset 0 0 20px rgba(220,183,115,0.10)" }}
          aria-hidden="true"
        />

        <div
          className="relative z-10 h-44 w-44 md:h-52 md:w-52"
          style={{ filter: "drop-shadow(0 0 40px rgba(220,183,115,0.40))" }}
        >
          <img src="/phd-logo.png" alt="Papi Hair Design" className="h-full w-full object-contain" />
        </div>
      </div>

      <div className="z-10 flex h-20 flex-col items-center">
        <h1
          ref={titleRef}
          className="mb-2 ml-3 text-[27px] font-bold tracking-[0.4em] text-text-primary opacity-0 md:text-[33px]"
          style={{ textShadow: "0 0 15px rgba(255,255,255,0.20)" }}
        >
          PAPI HAIR
        </h1>
        <h2
          ref={subtitleRef}
          className="ml-2 text-[13px] uppercase tracking-[0.5em] text-text-gold opacity-0 md:text-[15px]"
        >
          Design
        </h2>
      </div>

      <div className="absolute bottom-16 h-[1px] w-48 overflow-hidden bg-gold/10 md:w-64" aria-hidden="true">
        <div
          ref={barRef}
          className="h-full"
          style={{
            width: "0%",
            transition: "width 2500ms ease-out",
            background: "linear-gradient(to right, transparent, var(--color-gold), var(--gold-100))",
            boxShadow: "0 0 10px var(--color-gold)",
          }}
        />
      </div>
    </div>
  );
}
