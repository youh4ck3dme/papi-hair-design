import type { ServiceRow } from "@/components/booking/types";
import { sortServicesByCanonicalOrder } from "@/lib/priceListOrder";
import {
  resolveManagedServiceCategory,
  resolveManagedServiceSubcategoryForService,
} from "@/lib/serviceSubcategoryBlueprint";

export type PricingCategoryKey = "panske" | "damske" | "doplnkove";

export interface PricingCatalogService extends ServiceRow {
  pricingCategory: PricingCategoryKey;
  pricingSubcategory: string | null;
}

export interface PricingCatalogSection {
  name: string;
  services: PricingCatalogService[];
}

export interface PricingCatalogCategory {
  key: PricingCategoryKey;
  title: string;
  description: string;
  emptyLabel: string;
  sections: PricingCatalogSection[];
  serviceCount: number;
}

const PRICING_CATEGORY_ORDER: PricingCategoryKey[] = ["panske", "damske", "doplnkove"];
const UNCATEGORIZED_SECTION_NAME = "Ostatné služby";
const DOPLNKOVE_SECTION_NAME = "Doplnkové služby";

const PRICING_CATEGORY_META: Record<
  PricingCategoryKey,
  Omit<PricingCatalogCategory, "sections" | "serviceCount">
> = {
  panske: {
    key: "panske",
    title: "Pánske služby",
    description: "Strihy, brada, farba a kombinované barber služby.",
    emptyLabel: "Momentálne nie sú dostupné žiadne pánske služby.",
  },
  damske: {
    key: "damske",
    title: "Dámske služby",
    description: "Strih, farbenie, melír, balayage, regenerácia aj účesy.",
    emptyLabel: "Momentálne nie sú dostupné žiadne dámske služby.",
  },
  doplnkove: {
    key: "doplnkove",
    title: "Doplnkové služby",
    description: "Rýchle doplnkové úpravy a servisné služby navyše.",
    emptyLabel: "Momentálne nie sú dostupné žiadne doplnkové služby.",
  },
};

function normalizePricingService(service: ServiceRow): PricingCatalogService {
  const resolvedCategory = resolveManagedServiceCategory(service);
  const resolvedDefinition = resolveManagedServiceSubcategoryForService({
    name_sk: service.name_sk,
    category: service.category,
    subcategory: service.subcategory,
  });
  const resolvedSubcategory =
    service.subcategory?.trim() || resolvedDefinition?.name_sk || null;

  const pricingCategory: PricingCategoryKey =
    resolvedCategory === "panske" && resolvedSubcategory === DOPLNKOVE_SECTION_NAME
      ? "doplnkove"
      : resolvedCategory;

  return {
    ...service,
    category: resolvedCategory,
    subcategory: resolvedSubcategory,
    pricingCategory,
    pricingSubcategory:
      pricingCategory === "doplnkove"
        ? DOPLNKOVE_SECTION_NAME
        : resolvedSubcategory,
  };
}

export function buildPricingCatalog(services: ServiceRow[]): PricingCatalogCategory[] {
  const activeServices = services.filter((service) => service.is_active !== false);
  const normalizedServices = sortServicesByCanonicalOrder(
    activeServices.map(normalizePricingService),
  );

  return PRICING_CATEGORY_ORDER.map((categoryKey) => {
    const categoryServices = normalizedServices.filter(
      (service) => service.pricingCategory === categoryKey,
    );

    const sectionsMap = new Map<string, PricingCatalogService[]>();

    for (const service of categoryServices) {
      const sectionName =
        service.pricingSubcategory?.trim() ||
        (categoryKey === "doplnkove"
          ? DOPLNKOVE_SECTION_NAME
          : UNCATEGORIZED_SECTION_NAME);

      const bucket = sectionsMap.get(sectionName) ?? [];
      bucket.push(service);
      sectionsMap.set(sectionName, bucket);
    }

    return {
      ...PRICING_CATEGORY_META[categoryKey],
      sections: Array.from(sectionsMap.entries()).map(([name, groupedServices]) => ({
        name,
        services: groupedServices,
      })),
      serviceCount: categoryServices.length,
    };
  });
}
