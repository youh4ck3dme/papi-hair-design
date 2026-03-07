import { useState, useCallback } from "react";
import { toast } from "sonner";

export function useWebAuthn() {
  const [loading, setLoading] = useState(false);
  const isSupported = false; // Temporarily disabled while Firebase passkey flow is being updated

  const checkPlatformAuthenticator = useCallback(async () => {
    return false;
  }, []);

  const registerPasskey = useCallback(async (deviceName?: string) => {
    toast.error("Prihlásenie cez Passkey sa momentálne aktualizuje. Skúste prosím heslo.");
    return false;
  }, []);

  const authenticateWithPasskey = useCallback(async (email?: string) => {
    toast.error("Prihlásenie cez Passkey sa momentálne aktualizuje. Použite prosím heslo.");
    return false;
  }, []);

  return { isSupported, loading, checkPlatformAuthenticator, registerPasskey, authenticateWithPasskey };
}
