import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Landing page uses its own install prompt treatment.
    if (location.pathname === "/") {
      setShowBanner(false);
      setDeferredPrompt(null);
      return;
    }

    if (localStorage.getItem("pwa-install-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const installedHandler = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [location.pathname]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed bottom-4 left-4 right-4 z-[9999] border-4 border-white bg-black p-5 text-white shadow-[8px_8px_0px_0px_rgba(255,215,0,1)] md:bottom-6 md:left-auto md:right-6 md:w-[400px]"
        >
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 p-1 transition-colors hover:bg-white/20"
            aria-label="Zavrieť"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-white bg-amber-500">
              <Download size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-sm font-black uppercase tracking-wide">
                Nainštalovať Papi Hair Design
              </h3>
              <p className="mb-3 text-xs font-bold text-white/70">
                Pridajte si aplikáciu na plochu pre rýchlejší prístup a offline režim.
              </p>
              <button
                onClick={handleInstall}
                className="min-h-[44px] w-full border-2 border-white bg-amber-500 py-3 text-sm font-black uppercase tracking-widest text-black transition-all active:translate-y-0.5 hover:bg-white hover:text-black"
              >
                Inštalovať
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
