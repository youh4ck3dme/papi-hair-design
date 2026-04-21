import { cn } from "@/lib/utils";
import { APP_LOGO_SRC } from "@/lib/branding";

interface LogoIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

export function LogoIcon({ className = "", size = "md" }: LogoIconProps) {
  return (
    <img
      src={APP_LOGO_SRC}
      alt="PAPI HAIR DESIGN"
      className={cn(sizeMap[size], "rounded-full object-cover shrink-0", className)}
    />
  );
}
