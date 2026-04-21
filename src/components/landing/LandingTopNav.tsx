import { PublicStickyHeader } from "@/components/public/PublicStickyHeader";

interface LandingTopNavProps {
  onOpenPrice: () => void;
}

export function LandingTopNav({ onOpenPrice }: LandingTopNavProps) {
  return <PublicStickyHeader onPriceAction={onOpenPrice} currentOverride="home" className="px-0 pb-0 pt-0" />;
}
