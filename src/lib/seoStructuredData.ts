import {
  APP_ADDRESS,
  APP_BRAND_NAME,
  APP_CONTACT_EMAIL,
  APP_CONTACT_PHONE,
  APP_MAP_URL,
  APP_SITE_URL,
} from "@/lib/brandConfig";

type JsonLd = Record<string, unknown>;

export function buildHomeStructuredData(): JsonLd[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${APP_SITE_URL}/#website`,
      url: `${APP_SITE_URL}/`,
      name: APP_BRAND_NAME,
      inLanguage: "sk-SK",
    },
    {
      "@context": "https://schema.org",
      "@type": "HairSalon",
      "@id": `${APP_SITE_URL}/#localbusiness`,
      name: APP_BRAND_NAME,
      url: `${APP_SITE_URL}/`,
      image: `${APP_SITE_URL}/icon-512x512.png`,
      logo: `${APP_SITE_URL}/phd-logo.png`,
      telephone: APP_CONTACT_PHONE,
      email: APP_CONTACT_EMAIL,
      priceRange: "$$",
      currenciesAccepted: "EUR",
      address: {
        "@type": "PostalAddress",
        streetAddress: APP_ADDRESS.street,
        addressLocality: APP_ADDRESS.locality,
        addressCountry: APP_ADDRESS.countryCode,
      },
      areaServed: {
        "@type": "City",
        name: APP_ADDRESS.locality,
      },
      hasMap: APP_MAP_URL,
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: APP_CONTACT_PHONE,
          contactType: "customer service",
          areaServed: APP_ADDRESS.countryCode,
          availableLanguage: ["sk", "en"],
        },
      ],
      makesOffer: {
        "@type": "OfferCatalog",
        name: "Kadernícke a barber služby",
        itemListElement: [
          {
            "@type": "OfferCatalog",
            name: "Dámske služby",
          },
          {
            "@type": "OfferCatalog",
            name: "Pánske služby",
          },
          {
            "@type": "OfferCatalog",
            name: "Doplnkové služby",
          },
        ],
      },
    },
  ];
}

export function serializeStructuredData(data: JsonLd): string {
  return JSON.stringify(data);
}
