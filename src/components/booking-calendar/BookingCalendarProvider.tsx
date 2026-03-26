import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookingCalendarContext } from "./calendar-context";
import type { BookingCalendarEvent, BookingCalendarMode } from "./calendar-types";
import type { SlotInfo } from "./calendar-context";
import { matchesCalendarSearch } from "./event-search";

export interface BookingCalendarProviderProps {
  events: BookingCalendarEvent[];
  date: Date;
  setDate: (date: Date) => void;
  mode: BookingCalendarMode;
  setMode: (mode: BookingCalendarMode) => void;
  onSelectSlot?: (slot: SlotInfo) => void;
  onSelectEvent?: (event: BookingCalendarEvent) => void;
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
  selectable,
  businessHours,
  resources,
  children,
}: BookingCalendarProviderProps) {
  const [pixelsPerHour, setPixelsPerHour] = useState(128);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [monthDensity, setMonthDensity] = useState<"compact" | "comfortable">("comfortable");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 1024px)");
    const updatePixelsPerHour = () => setPixelsPerHour(query.matches ? 102 : 128);
    updatePixelsPerHour();
    query.addEventListener("change", updatePixelsPerHour);
    return () => query.removeEventListener("change", updatePixelsPerHour);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const filteredEvents = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return events;
    return events.filter((event) => matchesCalendarSearch(event, debouncedSearchQuery));
  }, [debouncedSearchQuery, events]);

  return (
    <BookingCalendarContext.Provider
      value={{
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
        selectable,
        businessHours,
        resources,
        pixelsPerHour,
      }}
    >


      {children}
    </BookingCalendarContext.Provider>
  );
}
