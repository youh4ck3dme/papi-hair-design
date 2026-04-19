import { getSectionOrderIndex, getServiceOrderIndex } from "@/lib/priceListOrder";

export type BookingMainCategory = "damske" | "panske";
export type ServiceCategoryValue = BookingMainCategory | "doplnkove" | "ostatne";

export const BOOKING_MAIN_CATEGORIES: ReadonlyArray<{
  id: BookingMainCategory;
  label: string;
}> = [
  { id: "damske", label: "Dámske služby" },
  { id: "panske", label: "Pánske služby" },
];

export const UNCATEGORIZED_SUBCATEGORY_KEY = "__uncategorized__";
const MAX_FALLBACK_SORT = Number.MAX_SAFE_INTEGER;
const MEN_PATTERN =
  /(p[aá]nsk|brad|junior|depil[aá]cia nosa|u[šs]n[eé] svie[cč]k|maska|t[oó]novanie sed[ií]n)/i;
const FALLBACK_ORDER_OFFSET = 10_000;

export interface ServiceSubcategoryRow {
  id: string;
  business_id: string;
  category: BookingMainCategory;
  name_sk: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ServiceSubcategoryOption {
  key: string;
  id: string | null;
  category: BookingMainCategory;
  name_sk: string;
  slug: string;
  sort_order: number;
  isFallback: boolean;
  isUncategorized: boolean;
  serviceCount: number;
}

export interface ServiceSubcategoryGroup<T extends ServiceCatalogLike> {
  option: ServiceSubcategoryOption;
  services: T[];
}

export interface ServiceCatalogLike {
  id: string;
  name_sk: string;
  category: string | null;
  subcategory: string | null;
  subcategory_id?: string | null;
  sort_order?: number | null;
}

function compareSkText(a: string, b: string) {
  return a.localeCompare(b, "sk", { sensitivity: "base" });
}

export function normalizeSubcategoryName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function slugifySubcategoryName(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "podkategoria";
}

export function resolveServiceCategory(service: Pick<ServiceCatalogLike, "category" | "name_sk">): BookingMainCategory {
  if (service.category === "damske" || service.category === "panske") {
    return service.category;
  }

  const normalizedName = service.name_sk ?? "";
  return MEN_PATTERN.test(normalizedName.toLowerCase()) ? "panske" : "damske";
}

export function resolveServiceSubcategoryId(service: Pick<ServiceCatalogLike, "subcategory_id">): string | null {
  return typeof service.subcategory_id === "string" && service.subcategory_id.trim().length > 0
    ? service.subcategory_id
    : null;
}

export function resolveServiceSortOrder(service: Pick<ServiceCatalogLike, "sort_order">): number | null {
  return typeof service.sort_order === "number" && Number.isFinite(service.sort_order)
    ? service.sort_order
    : null;
}

function getOptionSortOrder(category: BookingMainCategory, name: string, explicitSortOrder: number | null) {
  if (typeof explicitSortOrder === "number" && Number.isFinite(explicitSortOrder)) {
    return explicitSortOrder;
  }

  const canonicalOrder = getSectionOrderIndex(category, name);
  return canonicalOrder === MAX_FALLBACK_SORT
    ? MAX_FALLBACK_SORT
    : FALLBACK_ORDER_OFFSET + canonicalOrder;
}

function compareOptionOrder(a: ServiceSubcategoryOption, b: ServiceSubcategoryOption) {
  if (a.isUncategorized !== b.isUncategorized) {
    return a.isUncategorized ? 1 : -1;
  }

  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order;
  }

  return compareSkText(a.name_sk, b.name_sk);
}

export function sortServiceSubcategories(subcategories: ServiceSubcategoryRow[]): ServiceSubcategoryRow[] {
  return [...subcategories].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }

    const aSort = getOptionSortOrder(a.category, a.name_sk, a.sort_order);
    const bSort = getOptionSortOrder(b.category, b.name_sk, b.sort_order);
    if (aSort !== bSort) {
      return aSort - bSort;
    }

    return compareSkText(a.name_sk, b.name_sk);
  });
}

function serviceMatchesOption<T extends ServiceCatalogLike>(service: T, option: ServiceSubcategoryOption) {
  if (resolveServiceCategory(service) !== option.category) {
    return false;
  }

  const subcategoryName = normalizeSubcategoryName(service.subcategory);
  const subcategoryId = resolveServiceSubcategoryId(service);

  if (option.isUncategorized) {
    return subcategoryName == null;
  }

  if (option.id && subcategoryId === option.id) {
    return true;
  }

  return subcategoryName === normalizeSubcategoryName(option.name_sk);
}

export function sortServicesForDisplay<T extends ServiceCatalogLike>(
  services: T[],
  category: BookingMainCategory,
  subcategoryName: string | null,
): T[] {
  return [...services].sort((a, b) => {
    const aSort = resolveServiceSortOrder(a);
    const bSort = resolveServiceSortOrder(b);

    if (aSort != null || bSort != null) {
      const normalizedA = aSort ?? MAX_FALLBACK_SORT;
      const normalizedB = bSort ?? MAX_FALLBACK_SORT;
      if (normalizedA !== normalizedB) {
        return normalizedA - normalizedB;
      }
    }

    if (subcategoryName) {
      const serviceOrderDiff =
        getServiceOrderIndex(category, subcategoryName, a.name_sk) -
        getServiceOrderIndex(category, subcategoryName, b.name_sk);
      if (serviceOrderDiff !== 0) {
        return serviceOrderDiff;
      }
    }

    return compareSkText(a.name_sk, b.name_sk);
  });
}

export function buildServiceSubcategoryOptions<T extends ServiceCatalogLike>(
  services: T[],
  subcategories: ServiceSubcategoryRow[],
  category: BookingMainCategory,
  options?: {
    includeEmpty?: boolean;
    uncategorizedLabel?: string;
  },
): ServiceSubcategoryOption[] {
  const includeEmpty = options?.includeEmpty === true;
  const uncategorizedLabel = options?.uncategorizedLabel ?? "Ostatné služby";
  const categoryServices = services.filter((service) => resolveServiceCategory(service) === category);
  const activeSubcategories = sortServiceSubcategories(
    subcategories.filter((subcategory) => subcategory.category === category && subcategory.is_active !== false),
  );

  const matchedServiceIds = new Set<string>();
  const derivedOptions: ServiceSubcategoryOption[] = [];

  for (const subcategory of activeSubcategories) {
    const serviceCount = categoryServices.filter((service) => serviceMatchesOption(service, {
      key: `subcategory:${subcategory.id}`,
      id: subcategory.id,
      category,
      name_sk: subcategory.name_sk,
      slug: subcategory.slug,
      sort_order: getOptionSortOrder(category, subcategory.name_sk, subcategory.sort_order),
      isFallback: false,
      isUncategorized: false,
      serviceCount: 0,
    })).length;

    categoryServices.forEach((service) => {
      if (
        serviceMatchesOption(service, {
          key: `subcategory:${subcategory.id}`,
          id: subcategory.id,
          category,
          name_sk: subcategory.name_sk,
          slug: subcategory.slug,
          sort_order: getOptionSortOrder(category, subcategory.name_sk, subcategory.sort_order),
          isFallback: false,
          isUncategorized: false,
          serviceCount: 0,
        })
      ) {
        matchedServiceIds.add(service.id);
      }
    });

    if (includeEmpty || serviceCount > 0) {
      derivedOptions.push({
        key: `subcategory:${subcategory.id}`,
        id: subcategory.id,
        category,
        name_sk: subcategory.name_sk,
        slug: subcategory.slug,
        sort_order: getOptionSortOrder(category, subcategory.name_sk, subcategory.sort_order),
        isFallback: false,
        isUncategorized: false,
        serviceCount,
      });
    }
  }

  const legacyBuckets = new Map<string, { name: string; count: number }>();
  for (const service of categoryServices) {
    if (matchedServiceIds.has(service.id)) continue;

    const legacyName = normalizeSubcategoryName(service.subcategory);
    if (!legacyName) continue;

    const slug = slugifySubcategoryName(legacyName);
    const bucket = legacyBuckets.get(slug) ?? { name: legacyName, count: 0 };
    bucket.count += 1;
    legacyBuckets.set(slug, bucket);
  }

  for (const [slug, bucket] of legacyBuckets.entries()) {
    derivedOptions.push({
      key: `legacy:${slug}`,
      id: null,
      category,
      name_sk: bucket.name,
      slug,
      sort_order: getOptionSortOrder(category, bucket.name, null),
      isFallback: true,
      isUncategorized: false,
      serviceCount: bucket.count,
    });
  }

  const uncategorizedCount = categoryServices.filter((service) => {
    if (matchedServiceIds.has(service.id)) return false;
    return normalizeSubcategoryName(service.subcategory) == null;
  }).length;

  if (includeEmpty ? categoryServices.length > 0 : uncategorizedCount > 0) {
    derivedOptions.push({
      key: UNCATEGORIZED_SUBCATEGORY_KEY,
      id: null,
      category,
      name_sk: uncategorizedLabel,
      slug: UNCATEGORIZED_SUBCATEGORY_KEY,
      sort_order: MAX_FALLBACK_SORT,
      isFallback: true,
      isUncategorized: true,
      serviceCount: uncategorizedCount,
    });
  }

  return derivedOptions.sort(compareOptionOrder);
}

export function filterServicesBySubcategoryOption<T extends ServiceCatalogLike>(
  services: T[],
  category: BookingMainCategory,
  option: ServiceSubcategoryOption | null,
): T[] {
  const categoryServices = services.filter((service) => resolveServiceCategory(service) === category);
  if (!option) {
    return sortServicesForDisplay(categoryServices, category, null);
  }

  const matchedServices = categoryServices.filter((service) => serviceMatchesOption(service, option));
  return sortServicesForDisplay(
    matchedServices,
    category,
    option.isUncategorized ? null : option.name_sk,
  );
}

export function buildServiceSubcategoryGroups<T extends ServiceCatalogLike>(
  services: T[],
  subcategories: ServiceSubcategoryRow[],
  category: BookingMainCategory,
  options?: {
    includeEmpty?: boolean;
    uncategorizedLabel?: string;
  },
): ServiceSubcategoryGroup<T>[] {
  return buildServiceSubcategoryOptions(services, subcategories, category, options).map((option) => ({
    option,
    services: filterServicesBySubcategoryOption(services, category, option),
  }));
}
