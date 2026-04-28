import { EMBEDDED_PUBLIC_HEADER_CLASSNAME, PublicStickyHeader } from "@/components/public/PublicStickyHeader";

interface LandingTopNavProps {
  onOpenPrice: () => void;
}

export function LandingTopNav({ onOpenPrice }: LandingTopNavProps) {
  return <PublicStickyHeader onPriceAction={onOpenPrice} currentOverride="home" className={EMBEDDED_PUBLIC_HEADER_CLASSNAME} />;
}
