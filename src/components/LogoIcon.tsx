import { cn } from "@/lib/utils";

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

export function LogoIcon({ className = "", size = "md", color = "currentColor" }: LogoIconProps) {
  return (
    <div className={cn(sizeMap[size], "flex items-center justify-center font-black rounded-none border-4 border-current", className)} style={{ color }}>
      <svg viewBox="0 0 100 100" className="w-full h-full p-1 fill-current">
        {/* Brutalist 'H' Logo */}
        <rect x="20" y="20" width="15" height="60" />
        <rect x="65" y="20" width="15" height="60" />
        <rect x="35" y="42.5" width="30" height="15" />
      </svg>
    </div>
  );
}
