import { useBookingCalendarContext } from "../calendar-context";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Maximize2, Minimize2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function CalendarZoomControls() {
  const { mode, zoomLevel, setZoomLevel } = useBookingCalendarContext();

  if (mode === "month") return null;

  const steps: ("compact" | "normal" | "detail")[] = ["compact", "normal", "detail"];
  const currentIndex = steps.indexOf(zoomLevel);

  const handleZoomIn = () => {
    if (currentIndex < steps.length - 1) {
      setZoomLevel(steps[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    if (currentIndex > 0) {
      setZoomLevel(steps[currentIndex - 1]);
    }
  };

  const labels = {
    compact: "Kompaktné",
    normal: "Normálne",
    detail: "Detailné",
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none safe-bottom">
      <div className="flex items-center gap-1 p-1.5 rounded-full bg-background/80 backdrop-blur-xl border border-primary/20 shadow-2xl pointer-events-auto">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-primary/10 transition-colors"
          onClick={handleZoomOut}
          disabled={currentIndex === 0}
          aria-label="Zmenšiť"
        >
          <Minus className="h-4 w-4" />
        </Button>
        
        <div className="px-3 py-1 min-w-[90px] text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary/80">
            {labels[zoomLevel]}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-primary/10 transition-colors"
          onClick={handleZoomIn}
          disabled={currentIndex === steps.length - 1}
          aria-label="Zväčšiť"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
