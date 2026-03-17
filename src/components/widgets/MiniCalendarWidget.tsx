"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface MiniCalendarWidgetProps {
  events?: { date: Date; count: number; color?: string }[];
  onDateClick?: (date: Date) => void;
}

export function MiniCalendarWidget({ events = [], onDateClick }: MiniCalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

  const getEventForDay = (date: Date) => {
    return events.find((e) => isSameDay(new Date(e.date), date));
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {format(currentMonth, "LLLL yyyy", { locale: pl })}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {/* Nagłówki dni tygodnia */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((dayName) => (
            <div
              key={dayName}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Dni miesiąca */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((dayItem, index) => {
            const isCurrentMonth = isSameMonth(dayItem, currentMonth);
            const isToday = isSameDay(dayItem, today);
            const event = getEventForDay(dayItem);

            return (
              <button
                key={index}
                onClick={() => onDateClick?.(dayItem)}
                className={cn(
                  "relative h-8 w-full rounded text-sm transition-colors",
                  "hover:bg-accent",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isToday && "bg-primary text-primary-foreground hover:bg-primary/90",
                  event && !isToday && "font-semibold"
                )}
              >
                {format(dayItem, "d")}
                {event && (
                  <div
                    className={cn(
                      "absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                      isToday ? "bg-primary-foreground" : event.color || "bg-primary"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Link do pełnego kalendarza */}
        <div className="mt-3 pt-2 border-t">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/calendar">Zobacz pełny kalendarz</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

