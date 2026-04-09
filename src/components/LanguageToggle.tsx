import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const toggle = () => {
    const next = isEn ? "sk" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="group relative flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 text-xs font-bold tracking-[0.1em] transition-all hover:border-primary/30 hover:bg-white/10"
      aria-label="Switch language / Zmeniť jazyk"
    >
      <Globe className="h-4 w-4 text-primary transition-transform group-hover:rotate-[30deg]" />
      <span className="text-white/70 group-hover:text-white">
        {isEn ? "EN" : "SK"}
      </span>
      <div className="absolute inset-0 rounded-full bg-primary/5 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
    </Button>
  );
}
