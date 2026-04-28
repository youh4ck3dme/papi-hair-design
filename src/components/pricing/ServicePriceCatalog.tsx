import { Clock3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AppSplashScreen } from "@/components/AppSplashScreen";
import type { ServiceRow } from "@/components/booking/types";
import {
  buildPricingCatalog,
  type PricingCategoryKey,
} from "@/lib/pricingCatalog";
import { cn } from "@/lib/utils";

interface ServicePriceCatalogProps {
  services: ServiceRow[];
  initialLoading?: boolean;
  variant?: "page" | "drawer";
}

function resolveServiceDetail(service: ServiceRow): string {
  const description = service.description_sk?.trim();
  if (description) {
    return description;
  }

  return `${service.duration_minutes} min`;
}

export function ServicePriceCatalog({
  services,
  initialLoading = false,
  variant = "page",
}: ServicePriceCatalogProps) {
  const categories = useMemo(() => buildPricingCatalog(services), [services]);
  const [activeCategory, setActiveCategory] = useState<PricingCategoryKey>("panske");
  const activeGroup =
    categories.find((category) => category.key === activeCategory) ?? categories[0];

  const isDrawer = variant === "drawer";

  if (initialLoading) {
    return <AppSplashScreen compact testId="pricing-loading-state" />;
  }

  return (
    <div className={cn("space-y-6", isDrawer ? "space-y-5" : "space-y-8")}>
      <div className={cn("grid gap-3", isDrawer ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3")}>
        {categories.map((category) => {
          const isActive = activeGroup.key === category.key;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
              className={cn(
                "rounded-2xl border px-4 py-4 text-left transition-all duration-200 active:scale-[0.99]",
                isActive
                  ? "border-gold/50 bg-gold/[0.09] shadow-[0_0_0_1px_rgba(201,168,76,0.24),0_16px_40px_-28px_rgba(201,168,76,0.38)]"
                  : "border-gold/14 bg-white/[0.02] hover:border-gold/32 hover:bg-gold/[0.05]",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.16em] text-text-primary">
                    {category.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-text-caption">
                    {category.description}
                  </p>
                </div>
                <span className="rounded-full border border-gold/20 bg-black/30 px-3 py-1 text-xs font-bold text-gold">
                  {category.serviceCount}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[28px] border border-gold/14 bg-[linear-gradient(180deg,rgba(14,12,10,0.94),rgba(10,8,7,0.98))] p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-2 border-b border-gold/10 pb-4">
          <h3 className="text-xl font-black uppercase tracking-[0.14em] text-text-primary md:text-2xl">
            {activeGroup.title}
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-text-caption">
            {activeGroup.description}
          </p>
        </div>

        {activeGroup.sections.length === 0 ? (
          <div className="rounded-2xl border border-gold/10 bg-gold/[0.04] px-5 py-6 text-sm text-text-caption">
            {activeGroup.emptyLabel}
          </div>
        ) : (
          <div className="space-y-6">
            {activeGroup.sections.map((section) => (
              <section key={`${activeGroup.key}-${section.name}`} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-gradient-to-r from-gold/0 via-gold/30 to-gold/0" />
                  <h4 className="shrink-0 text-[11px] font-black uppercase tracking-[0.28em] text-gold/85">
                    {section.name}
                  </h4>
                  <span className="h-px flex-1 bg-gradient-to-r from-gold/0 via-gold/30 to-gold/0" />
                </div>

                <div className="space-y-3">
                  {section.services.map((service) => (
                    <article
                      key={service.id}
                      className="rounded-2xl border border-gold/12 bg-gold/[0.04] px-4 py-4 transition-colors hover:border-gold/24 hover:bg-gold/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h5 className="text-sm font-black uppercase tracking-[0.08em] text-text-primary">
                            {service.name_sk}
                          </h5>
                          <div className="mt-2 flex items-center gap-2 text-xs text-text-caption">
                            <Clock3 className="h-3.5 w-3.5 text-gold/80" />
                            <span>{resolveServiceDetail(service)}</span>
                          </div>
                        </div>
                        <div className="shrink-0 rounded-full border border-gold/24 bg-black/30 px-3 py-1.5 text-sm font-black text-gold">
                          {service.price != null ? `${service.price} €` : "Cena na dopyt"}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {!isDrawer && (
        <div className="flex justify-center">
          <Link
            to="/booking"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-gold/30 bg-gold/[0.08] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-gold transition-all duration-200 hover:border-gold/55 hover:bg-gold/[0.14] active:scale-95"
          >
            Rezervovať termín
          </Link>
        </div>
      )}
    </div>
  );
}
