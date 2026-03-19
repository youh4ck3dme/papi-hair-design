/**
 * Event chip farby z CSS premenných (--calendar-*) – light/dark a zlato/čierna téma.
 */
export const EVENT_COLOR_CLASSES: Record<string, string> = {
  pending:
    "bg-calendar-pending/5 hover:bg-calendar-pending/10 border-calendar-pending border-l-4 text-calendar-pending-fg",
  confirmed:
    "bg-calendar-confirmed/5 hover:bg-calendar-confirmed/10 border-calendar-confirmed border-l-4 text-calendar-confirmed-fg",
  cancelled:
    "bg-calendar-cancelled/5 hover:bg-calendar-cancelled/10 border-calendar-cancelled border-l-4 text-calendar-cancelled-fg",
  completed:
    "bg-calendar-completed/10 hover:bg-calendar-completed/20 border-calendar-completed border-l-4 text-calendar-completed-fg",
};

export function getEventColorClasses(color: string): string {
  if (color.startsWith("#")) {
    return "border-opacity-50 border-l-4"; // Base class for HEX colors
  }
  return (
    EVENT_COLOR_CLASSES[color] ??
    "bg-muted/30 hover:bg-muted/50 border-border border-l-4 text-foreground"
  );
}

