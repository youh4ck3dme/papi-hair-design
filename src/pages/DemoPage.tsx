import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  User, Shield, Crown, Copy, Check, Calendar, Users,
  BarChart3, Bell, Smartphone, Lock, Sparkles, QrCode, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";
import "@/styles/expanding-cards.css";

import cardBgHero from "@/assets/card-bg-hero.jpg";
import cardBgAccounts from "@/assets/card-bg-accounts.jpg";
import cardBgHow from "@/assets/card-bg-how.jpg";
import cardBgFeatures from "@/assets/card-bg-features.jpg";
import cardBgQr from "@/assets/card-bg-qr.jpg";

const cardBackgrounds: Record<string, string> = {
  hero: cardBgHero,
  accounts: cardBgAccounts,
  how: cardBgHow,
  features: cardBgFeatures,
  qr: cardBgQr,
};

/* ── Helpers ── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 p-1 rounded hover:bg-primary/10 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

const contentAnim: any = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -6, filter: "blur(2px)", transition: { duration: 0.35, ease: "easeIn" } },
};

/* ── Card Content Components ── */

function HeroContent({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <LogoIcon size="lg" />
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
        {t("demo.heroTitle")}<br />
        <span className="text-primary">{t("demo.heroSub")}</span>
      </h1>
      <p className="text-sm text-muted-foreground max-w-md">
        {t("demo.heroDesc")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" onClick={() => navigate("/booking")}>
          {t("demo.bookBtn")}
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
          {t("demo.loginBtn")}
        </Button>
      </div>
    </div>
  );
}

function AccountsContent({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { t } = useTranslation();

  const demoAccounts = [
    {
      role: t("demo.roleCustomer"), icon: User,
      email: "demo@papihairdesign.sk", password: "PapiDemo2025!",
      badge: "bg-primary/20 text-primary border-primary/30",
      description: t("demo.customerDesc"),
      redirect: "/booking",
    },
    {
      role: t("demo.roleOwner"), icon: Shield,
      email: "owner@papihairdesign.sk", password: "PapiDemo2025!",
      badge: "bg-accent text-accent-foreground border-border",
      description: t("demo.ownerDesc"),
      redirect: "/admin",
    },
    {
      role: t("demo.roleSuperadmin"), icon: Crown,
      email: "larsenevans@proton.me", password: null,
      badge: "bg-primary/15 text-primary border-primary/25",
      description: t("demo.superadminDesc"),
      redirect: "/admin",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">{t("demo.demoTitle")}</h2>
      {demoAccounts.map((acc) => (
        <div key={acc.email} className="rounded-xl border border-border/30 bg-card/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <acc.icon className="w-5 h-5 text-primary" />
            <Badge variant="outline" className={acc.badge}>{acc.role}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{acc.description}</p>
          <div className="text-xs space-y-1">
            <div className="flex items-center">
              <span className="text-muted-foreground w-12">{t("demo.emailLabel")}</span>
              <code className="text-foreground/80">{acc.email}</code>
              <CopyButton text={acc.email} />
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground w-12">{t("demo.passwordLabel")}</span>
              {acc.password ? (
                <>
                  <code className="text-foreground/80">{acc.password}</code>
                  <CopyButton text={acc.password} />
                </>
              ) : (
                <span className="text-primary text-xs">{t("demo.contactForPass")}</span>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); navigate(`/auth?redirect=${acc.redirect}`); }}>
            {t("demo.loginBtn2")}
          </Button>
        </div>
      ))}
    </div>
  );
}

function HowContent() {
  const { t } = useTranslation();
  const steps = [
    { num: "1", title: t("demo.step1Title"), desc: t("demo.step1Desc") },
    { num: "2", title: t("demo.step2Title"), desc: t("demo.step2Desc") },
    { num: "3", title: t("demo.step3Title"), desc: t("demo.step3Desc") },
  ];
  return (
    <div className="flex flex-col justify-center h-full gap-8">
      <h2 className="text-xl font-bold">{t("demo.howTitle")}</h2>
      {steps.map((s) => (
        <div key={s.num} className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full border border-primary/30 bg-card/30 flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {s.num}
          </div>
          <div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturesContent() {
  const { t } = useTranslation();
  const features = [
    { icon: Calendar, title: t("demo.feat1"), desc: t("demo.feat1Sub") },
    { icon: Users, title: t("demo.feat2"), desc: t("demo.feat2Sub") },
    { icon: BarChart3, title: t("demo.feat3"), desc: t("demo.feat3Sub") },
    { icon: Bell, title: t("demo.feat4"), desc: t("demo.feat4Sub") },
    { icon: Smartphone, title: t("demo.feat5"), desc: t("demo.feat5Sub") },
    { icon: Lock, title: t("demo.feat6"), desc: t("demo.feat6Sub") },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("demo.featTitle")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((f) => (
          <div key={f.title} className="flex gap-3 items-start rounded-lg border border-border/20 bg-card/20 p-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <f.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QrContent() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + "/booking")}&bgcolor=transparent&color=c8a864&format=svg`}
        alt={t("demo.qrAlt")}
        className="w-32 h-32 rounded-lg"
        loading="lazy"
      />
      <h3 className="font-semibold text-lg">{t("demo.qrTitle")}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {t("demo.qrDesc")}
      </p>
    </div>
  );
}

/* ── Main Component ── */

export default function DemoPage() {
  const [activeCard, setActiveCard] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const cards = [
    { id: "hero", label: t("demo.cardPapi"), sub: t("demo.cardPapiSub"), Icon: Sparkles },
    { id: "accounts", label: t("demo.cardDemo"), sub: t("demo.cardDemoSub"), Icon: User },
    { id: "how", label: t("demo.cardHow"), sub: t("demo.cardHowSub"), Icon: Zap },
    { id: "features", label: t("demo.cardFeatures"), sub: t("demo.cardFeaturesSub"), Icon: Calendar },
    { id: "qr", label: t("demo.cardQr"), sub: t("demo.cardQrSub"), Icon: QrCode },
  ];

  const contentMap: Record<string, React.ReactNode> = {
    hero: <HeroContent navigate={navigate} />,
    accounts: <AccountsContent navigate={navigate} />,
    how: <HowContent />,
    features: <FeaturesContent />,
    qr: <QrContent />,
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="expanding-cards">
        {cards.map((card, i) => {
          const isActive = activeCard === i;
          return (
            <div
              key={card.id}
              className={`expanding-cards__option ${isActive ? "expanding-cards__option--active" : ""}`}
              onClick={() => setActiveCard(i)}
            >
              <div
                className="expanding-cards__bg"
                style={{ backgroundImage: `url(${cardBackgrounds[card.id]})` }}
              />
              {!isActive && (
                <span className="expanding-cards__collapsed-label">{card.label}</span>
              )}
              <div className="expanding-cards__shadow" />
              <div className="expanding-cards__label">
                <div className="expanding-cards__label-icon">
                  <card.Icon className="w-5 h-5" />
                </div>
                <div className="expanding-cards__label-info">
                  <div className="expanding-cards__label-text expanding-cards__label-main">
                    {card.label}
                  </div>
                  <div className="expanding-cards__label-text expanding-cards__label-sub">
                    {card.sub}
                  </div>
                </div>
              </div>
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key={card.id}
                    className="expanding-cards__content"
                    {...contentAnim}
                  >
                    {contentMap[card.id]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-0 right-0 text-center text-muted-foreground text-xs opacity-50">
        {t("demo.footer")}
      </div>
    </div>
  );
}
