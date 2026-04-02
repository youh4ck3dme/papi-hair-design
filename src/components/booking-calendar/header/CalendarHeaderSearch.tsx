import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBookingCalendarContext } from "../calendar-context";
import { cn } from "@/lib/utils";

export function CalendarHeaderSearch() {
  const {
    events,
    filteredEvents,
    searchQuery,
    setSearchQuery,
    mode,
    monthDensity,
    setMonthDensity,
  } = useBookingCalendarContext();

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-2 py-1.5",
        mode === "month" && "lg:max-w-[36rem]",
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <Input
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Lupa: klient, služba, telefón, e-mail, ref..."
        className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
        aria-label="Hľadať v kalendári"
      />
      {searchQuery ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          aria-label="Vymazať hľadanie"
          onClick={() => setSearchQuery("")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      <div className="hidden shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5 sm:flex">
        <Button
          type="button"
          size="sm"
          variant={monthDensity === "compact" ? "default" : "ghost"}
          className="h-7 px-2 text-[11px]"
          onClick={() => setMonthDensity("compact")}
        >
          Compact
        </Button>
        <Button
          type="button"
          size="sm"
          variant={monthDensity === "comfortable" ? "default" : "ghost"}
          className="h-7 px-2 text-[11px]"
          onClick={() => setMonthDensity("comfortable")}
        >
          Comfortable
        </Button>
      </div>
      <span className="hidden shrink-0 text-[11px] text-muted-foreground md:inline">
        {filteredEvents.length}/{events.length}
      </span>
    </div>
  );
}
