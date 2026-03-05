import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MapPin, Phone, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background p-4 relative">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="text-center space-y-6 max-w-md">
        <div className="flex items-center justify-center gap-3">
          <LogoIcon size="lg" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">PAPI HAIR DESIGN</h1>
        <p className="text-muted-foreground text-lg">{t("index.tagline")}</p>
        <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {t("index.address")}</span>
          <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {t("index.phone")}</span>
          <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {t("index.email")}</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/booking">{t("index.bookBtn")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">{t("index.loginBtn")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
