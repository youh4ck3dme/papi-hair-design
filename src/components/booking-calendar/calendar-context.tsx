import { createContext, useContext } from "react";
import type { BookingCalendarEvent, BookingCalendarMode } from "./calendar-types";

export type CalendarZoomLevel =
  | "zoomOut30"
  | "zoomOut20"
  | "zoomOut10"
  | "normal"
  | "detail";

export interface SlotInfo {
  start: Date;
  end: Date;
}

export interface BookingCalendarContextValue {
  events: BookingCalendarEvent[];
  filteredEvents: BookingCalendarEvent[];
  date: Date;
  setDate: (date: Date) => void;
  mode: BookingCalendarMode;
  setMode: (mode: BookingCalendarMode) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  monthDensity: "compact" | "comfortable";
  setMonthDensity: (value: "compact" | "comfortable") => void;
  onSelectSlot?: (slot: SlotInfo) => void;
  onSelectEvent?: (event: BookingCalendarEvent) => void;
  selectable: boolean;
  businessHours?: any; // Business opening hours
  resources?: any[]; // List of resources (employees) for columns
  pixelsPerHour: number;
  zoomLevel: CalendarZoomLevel;
  setZoomLevel: (value: CalendarZoomLevel) => void;
}



export const BookingCalendarContext =
  createContext<BookingCalendarContextValue | undefined>(undefined);

export function useBookingCalendarContext() {
  const ctx = useContext(BookingCalendarContext);
  if (!ctx) {
    throw new Error(
      "useBookingCalendarContext must be used within BookingCalendarProvider"
    );
  }
  return ctx;
}
