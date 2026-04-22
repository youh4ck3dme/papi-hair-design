import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createServiceWorkerRegisterOptions,
  SERVICE_WORKER_UPDATE_TOAST_ID,
} from "./serviceWorkerRegistration";

function createToastMock() {
  return Object.assign(vi.fn(), {
    dismiss: vi.fn(),
  });
}

describe("serviceWorkerRegistration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("configures a persistent refresh prompt when a new version is available", () => {
    const toastMock = createToastMock();
    const updateServiceWorker = vi.fn(async () => undefined);
    const options = createServiceWorkerRegisterOptions(
      () => updateServiceWorker,
      toastMock as never,
    );

    options.onNeedRefresh();

    expect(options.immediate).toBe(true);
    expect(toastMock.dismiss).toHaveBeenCalledWith(SERVICE_WORKER_UPDATE_TOAST_ID);
    expect(toastMock).toHaveBeenCalledWith(
      "Je dostupná nová verzia aplikácie.",
      expect.objectContaining({
        id: SERVICE_WORKER_UPDATE_TOAST_ID,
        duration: Infinity,
        description: "Aktualizujte ju, keď dokončíte rozpracovanú prácu.",
        action: expect.objectContaining({ label: "Aktualizovať" }),
        cancel: expect.objectContaining({ label: "Neskôr" }),
      }),
    );
  });

  it("updates and dismisses the prompt when the refresh action is used", async () => {
    const toastMock = createToastMock();
    const updateServiceWorker = vi.fn(async () => undefined);
    const options = createServiceWorkerRegisterOptions(
      () => updateServiceWorker,
      toastMock as never,
    );

    options.onNeedRefresh();

    const [, toastOptions] = toastMock.mock.calls[0] as [string, {
      action: { onClick: () => Promise<void> };
    }];
    await toastOptions.action.onClick();

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(toastMock.dismiss).toHaveBeenLastCalledWith(SERVICE_WORKER_UPDATE_TOAST_ID);
  });

  it("dismisses the prompt when the user postpones the update", () => {
    const toastMock = createToastMock();
    const options = createServiceWorkerRegisterOptions(
      () => undefined,
      toastMock as never,
    );

    options.onNeedRefresh();

    const [, toastOptions] = toastMock.mock.calls[0] as [string, {
      cancel: { onClick: () => void };
    }];
    toastOptions.cancel.onClick();

    expect(toastMock.dismiss).toHaveBeenLastCalledWith(SERVICE_WORKER_UPDATE_TOAST_ID);
  });

  it("logs registration failures without throwing", () => {
    const toastMock = createToastMock();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const options = createServiceWorkerRegisterOptions(
      () => undefined,
      toastMock as never,
    );

    options.onRegisterError(new Error("boom"));

    expect(warnSpy).toHaveBeenCalledWith(
      "Service worker registration skipped:",
      expect.any(Error),
    );
  });
});
