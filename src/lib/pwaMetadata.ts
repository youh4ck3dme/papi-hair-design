const PUBLIC_MANIFEST = "/site.webmanifest";
const ADMIN_MANIFEST = "/manifest-admin.webmanifest";
const ADMIN_TITLE = "PAPI Hair Design Admin";
const ADMIN_THEME_COLOR = "#D6B25E";
const ADMIN_APPLE_TITLE = "PAPI Admin";

type MetadataElement = HTMLLinkElement | HTMLMetaElement;

function ensureHeadElement<T extends MetadataElement>(
  selector: string,
  createElement: () => T,
): { element: T; created: boolean } {
  const existing = document.head.querySelector<T>(selector);
  if (existing) return { element: existing, created: false };

  const element = createElement();
  document.head.appendChild(element);
  return { element, created: true };
}

export function applyAdminPwaMetadata(): () => void {
  const previousTitle = document.title;

  const manifest = ensureHeadElement('link[rel="manifest"]', () => {
    const element = document.createElement("link");
    element.rel = "manifest";
    return element;
  });
  const previousManifestHref = manifest.element.getAttribute("href");

  const themeColor = ensureHeadElement('meta[name="theme-color"]', () => {
    const element = document.createElement("meta");
    element.name = "theme-color";
    return element;
  });
  const previousThemeColor = themeColor.element.getAttribute("content");

  const appleTitle = ensureHeadElement('meta[name="apple-mobile-web-app-title"]', () => {
    const element = document.createElement("meta");
    element.name = "apple-mobile-web-app-title";
    return element;
  });
  const previousAppleTitle = appleTitle.element.getAttribute("content");

  document.title = ADMIN_TITLE;
  manifest.element.setAttribute("href", ADMIN_MANIFEST);
  themeColor.element.setAttribute("content", ADMIN_THEME_COLOR);
  appleTitle.element.setAttribute("content", ADMIN_APPLE_TITLE);

  return () => {
    document.title = previousTitle;

    if (manifest.created) {
      manifest.element.remove();
    } else {
      manifest.element.setAttribute("href", previousManifestHref ?? PUBLIC_MANIFEST);
    }

    if (themeColor.created) {
      themeColor.element.remove();
    } else if (previousThemeColor === null) {
      themeColor.element.removeAttribute("content");
    } else {
      themeColor.element.setAttribute("content", previousThemeColor);
    }

    if (appleTitle.created) {
      appleTitle.element.remove();
    } else if (previousAppleTitle === null) {
      appleTitle.element.removeAttribute("content");
    } else {
      appleTitle.element.setAttribute("content", previousAppleTitle);
    }
  };
}
