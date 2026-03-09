import { format, isSameDay } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  onlyDay?: boolean;
  resourceName?: string;
}

export function CalendarBodyHeader({ date, onlyDay = false, resourceName }: Props) {

  const isToday = isSameDay(date, new Date());

  return (
    <div className="flex items-center justify-center gap-1 py-2 w-full sticky top-0 bg-background z-10 border-b border-border">
      <span
        className={cn(
          "text-xs font-medium",
          isToday ? "text-gold font-semibold" : "text-muted-foreground"
        )}
      >
        {format(date, "EEE", { locale: sk })}
      </span>
      {!onlyDay && (
        <span
          className={cn(
            "text-xs font-medium",
            isToday ? "text-gold font-bold" : "text-foreground"
          )}
        >
          {format(date, "dd", { locale: sk })}
        </span>
      )}
      {resourceName && (
        <span className="block max-w-[11rem] truncate text-xs font-bold text-primary ml-2 border-l pl-2 border-border">
          {resourceName}
        </span>
      )}
    </div>

  );
}
