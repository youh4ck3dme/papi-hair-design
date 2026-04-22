const PRINT_CLEANUP_DELAY_MS = 1500;

export function printHtmlDocument(html: string): boolean {
  if (
    typeof document === "undefined" ||
    !document.body ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function" ||
    typeof Blob === "undefined"
  ) {
    return false;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.setAttribute("sandbox", "allow-modals");

  const printUrl = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" }),
  );

  const cleanup = () => {
    URL.revokeObjectURL(printUrl);
    iframe.remove();
  };

  iframe.addEventListener(
    "load",
    () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }

      frameWindow.addEventListener("afterprint", cleanup, { once: true });
      frameWindow.focus();
      frameWindow.print();
      globalThis.setTimeout(cleanup, PRINT_CLEANUP_DELAY_MS);
    },
    { once: true },
  );

  iframe.src = printUrl;
  document.body.appendChild(iframe);
  return true;
}
