import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

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
      className="h-10 rounded-full px-3 text-sm font-bold tracking-wider"
      aria-label="Switch language / Zmeniť jazyk"
    >
      {isEn ? "SK" : "EN"}
    </Button>
  );
}
