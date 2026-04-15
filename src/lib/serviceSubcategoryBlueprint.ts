import { resolveServiceCategory, type BookingMainCategory } from "./serviceSubcategories";

export interface ManagedServiceSubcategoryDefinition {
  category: BookingMainCategory;
  slug: string;
  name_sk: string;
  sort_order: number;
  matchers: RegExp[];
}

const DAMSKE_DEFINITIONS: ManagedServiceSubcategoryDefinition[] = [
  {
    category: "damske",
    slug: "balayage",
    name_sk: "Balayage",
    sort_order: 100,
    matchers: [/balayage/i],
  },
  {
    category: "damske",
    slug: "farbenie",
    name_sk: "Farbenie",
    sort_order: 200,
    matchers: [/farbenie/i, /\bfarba\b/i],
  },
  {
    category: "damske",
    slug: "fukana",
    name_sk: "Fúkaná",
    sort_order: 300,
    matchers: [/f[uú]kan/i, /styling/i],
  },
  {
    category: "damske",
    slug: "melir",
    name_sk: "Melír",
    sort_order: 400,
    matchers: [/mel[ií]r/i],
  },
  {
    category: "damske",
    slug: "napajanie-vlasov",
    name_sk: "Napájanie vlasov",
    sort_order: 500,
    matchers: [/tape[\s-]?in/i, /nap[aá]janie/i, /predl[žz]ovanie/i],
  },
  {
    category: "damske",
    slug: "odfarbovanie",
    name_sk: "Odfarbovanie",
    sort_order: 600,
    matchers: [/gumovanie/i, /[čc]istenie farby/i, /s[ťt]ahovanie farby/i, /odfarb/i],
  },
  {
    category: "damske",
    slug: "regeneracia",
    name_sk: "Regenerácia",
    sort_order: 700,
    matchers: [/methamorphyc/i, /kerat[ií]n/i, /regener/i, /k[uú]ra/i],
  },
  {
    category: "damske",
    slug: "strih",
    name_sk: "Strih",
    sort_order: 800,
    matchers: [/strihanie/i, /strih/i],
  },
  {
    category: "damske",
    slug: "ucesy",
    name_sk: "Účesy",
    sort_order: 900,
    matchers: [/vrk[oô]č/i, /[úu]čes/i],
  },
];

const PANSKE_DEFINITIONS: ManagedServiceSubcategoryDefinition[] = [
  {
    category: "panske",
    slug: "vlasy-a-brada",
    name_sk: "Vlasy a brada",
    sort_order: 500,
    matchers: [/vlasy a brada/i, /kombin[aá]cia/i, /p[aá]nsky [šs]peci[áa]l/i],
  },
  {
    category: "panske",
    slug: "brada",
    name_sk: "Brada",
    sort_order: 100,
    matchers: [/brad/i],
  },
  {
    category: "panske",
    slug: "doplnkove-sluzby",
    name_sk: "Doplnkové služby",
    sort_order: 200,
    matchers: [/depil[aá]cia/i, /u[šs]n[eé] svie[cč]k/i, /maska/i, /doplnkov/i],
  },
  {
    category: "panske",
    slug: "farba",
    name_sk: "Farba",
    sort_order: 300,
    matchers: [/trval[aá]/i, /zosvetlenie/i, /farbenie brady/i, /t[oó]novanie sed[ií]n/i, /\bfarb/i],
  },
  {
    category: "panske",
    slug: "vlasy",
    name_sk: "Vlasy",
    sort_order: 400,
    matchers: [/junior/i, /p[aá]nsky strih/i, /\bvlasy\b/i],
  },
];

const DEFINITIONS_BY_CATEGORY: Record<BookingMainCategory, ManagedServiceSubcategoryDefinition[]> = {
  damske: DAMSKE_DEFINITIONS,
  panske: PANSKE_DEFINITIONS,
};

const INFERENCE_ORDER_BY_CATEGORY: Record<BookingMainCategory, ManagedServiceSubcategoryDefinition[]> = {
  damske: DAMSKE_DEFINITIONS,
  panske: [
    PANSKE_DEFINITIONS[0],
    PANSKE_DEFINITIONS[3],
    PANSKE_DEFINITIONS[1],
    PANSKE_DEFINITIONS[2],
    PANSKE_DEFINITIONS[4],
  ],
};

export function getManagedServiceSubcategoryDefinitions(
  category: BookingMainCategory,
): ManagedServiceSubcategoryDefinition[] {
  return [...DEFINITIONS_BY_CATEGORY[category]].sort((a, b) => a.sort_order - b.sort_order);
}

export function getManagedServiceSubcategoryId(businessId: string, definition: ManagedServiceSubcategoryDefinition): string {
  return `${businessId}_${definition.slug}`;
}

export function findManagedServiceSubcategoryByName(
  category: BookingMainCategory,
  name: string | null | undefined,
): ManagedServiceSubcategoryDefinition | null {
  const normalizedName = name?.trim().toLocaleLowerCase("sk") ?? "";
  if (!normalizedName) return null;

  return (
    getManagedServiceSubcategoryDefinitions(category).find(
      (definition) => definition.name_sk.toLocaleLowerCase("sk") === normalizedName,
    ) ?? null
  );
}

function inferManagedServiceSubcategoryWithinCategory(
  serviceName: string,
  category: BookingMainCategory,
): ManagedServiceSubcategoryDefinition | null {
  return (
    INFERENCE_ORDER_BY_CATEGORY[category].find((definition) =>
      definition.matchers.some((matcher) => matcher.test(serviceName)),
    ) ?? null
  );
}

export function resolveManagedServiceCategory(service: {
  name_sk: string;
  category: string | null;
}): BookingMainCategory {
  if (service.category === "damske" || service.category === "panske") {
    return service.category;
  }

  if (inferManagedServiceSubcategoryWithinCategory(service.name_sk, "panske")) {
    return "panske";
  }

  if (inferManagedServiceSubcategoryWithinCategory(service.name_sk, "damske")) {
    return "damske";
  }

  return resolveServiceCategory(service);
}

export function inferManagedServiceSubcategory(
  serviceName: string,
  category: BookingMainCategory,
): ManagedServiceSubcategoryDefinition | null {
  return inferManagedServiceSubcategoryWithinCategory(serviceName, category);
}

export function resolveManagedServiceSubcategoryForService(service: {
  name_sk: string;
  category: string | null;
  subcategory: string | null;
}): ManagedServiceSubcategoryDefinition | null {
  const category = resolveManagedServiceCategory(service);
  return (
    findManagedServiceSubcategoryByName(category, service.subcategory) ??
    inferManagedServiceSubcategory(service.name_sk, category)
  );
}
