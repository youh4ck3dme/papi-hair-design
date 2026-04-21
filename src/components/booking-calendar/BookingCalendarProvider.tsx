import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { BookingCalendarContext } from "./calendar-context";
import type { CalendarZoomLevel, SlotInfo } from "./calendar-context";
import type { BookingCalendarEvent, BookingCalendarMode } from "./calendar-types";
import {
  buildCalendarSearchHaystack,
  buildCalendarSearchIndex,
  normalizeCalendarSearchQuery,
} from "./event-search";

export interface BookingCalendarProviderProps {
  events: BookingCalendarEvent[];
  date: Date;
  setDate: (date: Date) => void;
  mode: BookingCalendarMode;
  setMode: (mode: BookingCalendarMode) => void;
  onSelectSlot?: (slot: SlotInfo) => void;
  onSelectEvent?: (event: BookingCalendarEvent) => void;
  onLongPressSlot?: (slot: SlotInfo) => void;
  onLongPressEvent?: (event: BookingCalendarEvent) => void;
  selectable: boolean;
  businessHours?: any;
  resources?: any[];
  children: ReactNode;
}

export function BookingCalendarProvider({
  events,
  date,
  setDate,
  mode,
  setMode,
  onSelectSlot,
  onSelectEvent,
  onLongPressSlot,
  onLongPressEvent,
  selectable,
  businessHours,
  resources,
  children,
}: BookingCalendarProviderProps) {
  const [pixelsPerHourBase, setPixelsPerHourBase] = useState(128);
  const [zoomLevel, setZoomLevel] = useState<CalendarZoomLevel>("normal");
  const [searchQuery, setSearchQuery] = useState("");
  const [monthDensity, setMonthDensity] = useState<"compact" | "comfortable">("comfortable");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 1024px)");
    const updatePixelsPerHour = () => setPixelsPerHourBase(query.matches ? 102 : 128);
    updatePixelsPerHour();
    query.addEventListener("change", updatePixelsPerHour);
    return () => query.removeEventListener("change", updatePixelsPerHour);
  }, []);

  const pixelsPerHour = useMemo(() => {
    const zoomMap: Record<CalendarZoomLevel, number> = {
      zoomOut30: 0.7,
      zoomOut20: 0.8,
      zoomOut10: 0.9,
      normal: 1.0,
      detail: 1.2,
    };
    return Math.round(pixelsPerHourBase * zoomMap[zoomLevel]);
  }, [pixelsPerHourBase, zoomLevel]);

  const normalizedSearchQuery = useMemo(
    () => normalizeCalendarSearchQuery(deferredSearchQuery),
    [deferredSearchQuery],
  );

  const searchIndex = useMemo(() => buildCalendarSearchIndex(events), [events]);

  const filteredEvents = useMemo(() => {
    if (!normalizedSearchQuery) return events;
    return events.filter((event) => {
      const haystack = searchIndex.get(event.id) ?? buildCalendarSearchHaystack(event);
      return haystack.includes(normalizedSearchQuery);
    });
  }, [events, normalizedSearchQuery, searchIndex]);

  const contextValue = useMemo(
    () => ({
      events,
      filteredEvents,
      date,
      setDate,
      mode,
      setMode,
      searchQuery,
      setSearchQuery,
      monthDensity,
      setMonthDensity,
      onSelectSlot,
      onSelectEvent,
      onLongPressSlot,
      onLongPressEvent,
      selectable,
      businessHours,
      resources,
      pixelsPerHour,
      zoomLevel,
      setZoomLevel,
    }),
    [
      businessHours,
      date,
      events,
      filteredEvents,
      mode,
      monthDensity,
      onLongPressEvent,
      onSelectEvent,
      onLongPressSlot,
      onSelectSlot,
      pixelsPerHour,
      resources,
      searchQuery,
      selectable,
      setDate,
      setMode,
      zoomLevel,
    ],
  );

  return (
    <BookingCalendarContext.Provider value={contextValue}>
      {children}
    </BookingCalendarContext.Provider>
  );
}
