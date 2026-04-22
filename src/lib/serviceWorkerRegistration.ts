import { toast } from "sonner";

export const SERVICE_WORKER_UPDATE_TOAST_ID = "service-worker-update-available";

type UpdateServiceWorker = ((reloadPage?: boolean) => Promise<void>) | undefined;

export function createServiceWorkerRegisterOptions(
  getUpdateServiceWorker: () => UpdateServiceWorker,
  toastApi: typeof toast = toast,
) {
  return {
    immediate: true,
    onNeedRefresh() {
      toastApi.dismiss(SERVICE_WORKER_UPDATE_TOAST_ID);
      toastApi("Je dostupná nová verzia aplikácie.", {
        id: SERVICE_WORKER_UPDATE_TOAST_ID,
        duration: Infinity,
        description: "Aktualizujte ju, keď dokončíte rozpracovanú prácu.",
        action: {
          label: "Aktualizovať",
          onClick: async () => {
            try {
              await getUpdateServiceWorker()?.(true);
            } finally {
              toastApi.dismiss(SERVICE_WORKER_UPDATE_TOAST_ID);
            }
          },
        },
        cancel: {
          label: "Neskôr",
          onClick: () => {
            toastApi.dismiss(SERVICE_WORKER_UPDATE_TOAST_ID);
          },
        },
      });
    },
    onRegisterError(error: unknown) {
      console.warn("Service worker registration skipped:", error);
    },
  };
}
