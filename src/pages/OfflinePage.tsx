import { useTranslation } from "react-i18next";

export default function OfflinePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-2xl font-bold mb-2">{t("offline.title")}</h1>
      <p className="text-muted-foreground max-w-sm">
        {t("offline.message")}
      </p>
      <a
        href="/reception"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
      >
        {t("offline.btn")}
      </a>
    </div>
  );
}
