const SITE_URL = "https://booking.papihairdesign.sk";
const SITE_NAME = "PAPI HAIR DESIGN";
const STREET_ADDRESS = "Tr. SNP 61A";
const LOCALITY = "Košice";
const COUNTRY_CODE = "SK";
const PHONE = "+421949459624";
const EMAIL = "papihairdesign@gmail.com";
const MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Tr.%20SNP%2061A%2C%20Spolo%C4%8Densk%C3%BD%20pavil%C3%B3n%2C%20Ko%C5%A1ice";

type JsonLd = Record<string, unknown>;

export function buildHomeStructuredData(): JsonLd[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      inLanguage: "sk-SK",
    },
    {
      "@context": "https://schema.org",
      "@type": "HairSalon",
      "@id": `${SITE_URL}/#localbusiness`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      image: `${SITE_URL}/icon-512x512.png`,
      logo: `${SITE_URL}/phd-logo.png`,
      telephone: PHONE,
      email: EMAIL,
      priceRange: "$$",
      currenciesAccepted: "EUR",
      address: {
        "@type": "PostalAddress",
        streetAddress: STREET_ADDRESS,
        addressLocality: LOCALITY,
        addressCountry: COUNTRY_CODE,
      },
      areaServed: {
        "@type": "City",
        name: LOCALITY,
      },
      hasMap: MAP_URL,
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: PHONE,
          contactType: "customer service",
          areaServed: COUNTRY_CODE,
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

