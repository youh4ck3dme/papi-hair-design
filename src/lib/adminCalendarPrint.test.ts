import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { printHtmlDocument } from "./adminCalendarPrint";

describe("printHtmlDocument", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("queues printing through a hidden iframe and removes it after printing", () => {
    const focusMock = vi.fn();
    const printMock = vi.fn();
    const addEventListenerMock = vi.fn();
    const createObjectUrlMock = vi.fn(() => "blob:https://booking.papihairdesign.sk/print-doc");
    const revokeObjectUrlMock = vi.fn();

    const iframe = document.createElement("iframe");
    Object.defineProperty(iframe, "contentWindow", {
      configurable: true,
      value: {
        focus: focusMock,
        print: printMock,
        addEventListener: addEventListenerMock,
      },
    });

    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });

    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === "iframe") {
        return iframe;
      }
      return document.createElement(tagName);
    });

    const timeoutSpy = vi.spyOn(window, "setTimeout").mockImplementation(((cb: TimerHandler) => {
      if (typeof cb === "function") {
        cb();
      }
      return 0;
    }) as typeof window.setTimeout);

    expect(printHtmlDocument("<html><body>print</body></html>")).toBe(true);
    expect(document.body.contains(iframe)).toBe(true);
    expect(iframe.getAttribute("sandbox")).toBe("allow-modals");
    expect(iframe.getAttribute("src")).toBe("blob:https://booking.papihairdesign.sk/print-doc");

    iframe.dispatchEvent(new Event("load"));

    expect(createElementSpy).toHaveBeenCalledWith("iframe");
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(focusMock).toHaveBeenCalledTimes(1);
    expect(printMock).toHaveBeenCalledTimes(1);
    expect(addEventListenerMock).toHaveBeenCalledWith("afterprint", expect.any(Function), { once: true });
    expect(timeoutSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:https://booking.papihairdesign.sk/print-doc");
    expect(document.body.contains(iframe)).toBe(false);
  });
});
