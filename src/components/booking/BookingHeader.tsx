import { EMBEDDED_PUBLIC_HEADER_CLASSNAME, PublicStickyHeader } from "@/components/public/PublicStickyHeader";

export function BookingHeader() {
  return <PublicStickyHeader currentOverride="services" className={EMBEDDED_PUBLIC_HEADER_CLASSNAME} />;
}
