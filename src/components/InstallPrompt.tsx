import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (localStorage.getItem("pwa-install-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Track installation
    window.addEventListener("appinstalled", () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-[400px] z-[9999] bg-black text-white border-4 border-white p-5 shadow-[8px_8px_0px_0px_rgba(255,215,0,1)]"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 hover:bg-white/20 transition-colors"
            aria-label="Zavrieť"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 border-2 border-white flex items-center justify-center flex-shrink-0">
                <Download size={24} />
              </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm uppercase tracking-wide mb-1">
                Nainštalovať Papi Hair Design
              </h3>
              <p className="text-xs text-white/70 font-bold mb-3">
                Pridajte si aplikáciu na plochu pre rýchlejší prístup a offline režim.
              </p>
              <button
                onClick={handleInstall}
                className="w-full py-3 bg-amber-500 text-black font-black uppercase text-sm tracking-widest border-2 border-white hover:bg-white hover:text-black transition-all active:translate-y-0.5 min-h-[44px]"
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
