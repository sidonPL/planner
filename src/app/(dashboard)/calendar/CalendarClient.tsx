"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  startOfDay,
  differenceInDays,
} from "date-fns";
import { pl } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  List,
  Grid3X3,
  GripVertical,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Event, Task, Meal, Schedule, Category, Trip } from "@prisma/client";
import { EventFormDialog } from "@/components/calendar/EventFormDialog";
import { CalendarExport } from "@/components/calendar/CalendarExport";
import { toast } from "sonner";
import { generateBirthdayEventsForRange } from "@/lib/birthdays";
import { getHolidaysForRange } from "@/lib/holidays";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  color: string;
  type: "event" | "task" | "meal" | "schedule" | "trip" | "birthday" | "holiday" | "anniversary" | "nameday" | "imported";
  data?: EventWithUser | TaskWithRelations | MealWithRecipe | ScheduleWithUser | TripWithParticipants | {
    userId?: string;
    age?: number;
    holidayType?: string;
    description?: string;
    anniversaryType?: string;
    integrationName?: string;
    integrationType?: string;
  };
};

type EventWithUser = Event & {
  user: { id: string; name: string | null; color: string } | null;
};

type TaskWithRelations = Task & {
  category: Category | null;
  assignee: { id: string; name: string | null; color: string } | null;
};

type MealWithRecipe = Meal & {
  recipe: { id: string; name: string } | null;
};

type ScheduleWithUser = Schedule & {
  user: { id: string; name: string | null; color: string };
  exceptions: { id: string; date: Date; reason: string | null }[];
};

type TripWithParticipants = Trip & {
  participants: {
    user: { id: string; name: string | null; color: string };
    role: string | null;
  }[];
};

type Member = {
  id: string;
  name: string | null;
  email: string;
  color: string;
  avatar: string | null;
  birthDate: Date | null;
  nameDay: string | null;
};

interface CalendarClientProps {
  events: EventWithUser[];
  tasks: TaskWithRelations[];
  meals: MealWithRecipe[];
  schedules: ScheduleWithUser[];
  trips: TripWithParticipants[];
  members: Member[];
  externalBirthdays: {
    id: string;
    name: string;
    birthDate: Date;
    color: string;
    relationship: string | null;
  }[];
  anniversaries: {
    id: string;
    title: string;
    date: Date;
    type: string;
    color: string | null;
  }[];
  importedEvents: {
    id: string;
    title: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    location: string | null;
    isAllDay: boolean;
    integration: {
      id: string;
      name: string | null;
      type: string;
    };
  }[];
  currentUserId: string;
}

type ViewType = "month" | "week" | "day";

const mealTypeLabels: Record<string, string> = {
  BREAKFAST: "Śniadanie",
  SECOND_BREAKFAST: "II Śniadanie",
  LUNCH: "Obiad",
  SNACK: "Podwieczorek",
  DINNER: "Kolacja",
};

const mealTypeColors: Record<string, string> = {
  BREAKFAST: "#F59E0B",
  SECOND_BREAKFAST: "#F97316",
  LUNCH: "#10B981",
  SNACK: "#8B5CF6",
  DINNER: "#3B82F6",
};

// Komponent z obsługą resize dla widoku tygodniowego/dziennego
function ResizableEvent({
  event,
  onClick,
  onResize,
}: {
  event: CalendarEvent;
  onClick: () => void;
  onResize: (eventId: string, newEndDate: Date) => void;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [initialHeight, setInitialHeight] = useState(0);
  const eventRef = useRef<HTMLDivElement>(null);

  const isResizable = event.type === "event" && !event.allDay && event.end;

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!isResizable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setStartY(e.clientY);
    setInitialHeight(eventRef.current?.offsetHeight || 0);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!eventRef.current || !event.end) return;
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(30, initialHeight + deltaY);
      eventRef.current.style.height = `${newHeight}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!eventRef.current || !event.end) return;
      setIsResizing(false);

      const deltaY = e.clientY - startY;
      // Każde 30px = 30 minut
      const deltaMinutes = Math.round(deltaY / 30) * 30;

      if (deltaMinutes !== 0) {
        const newEndDate = new Date(event.end.getTime() + deltaMinutes * 60 * 1000);
        // Upewnij się, że koniec jest po początku
        if (newEndDate > event.start) {
          onResize(event.id, newEndDate);
        }
      }

      // Reset wysokości - zostanie zaktualizowana po odświeżeniu
      eventRef.current.style.height = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, startY, initialHeight, event, onResize]);

  // Oblicz wysokość na podstawie czasu trwania (30px na 30 minut)
  const durationMinutes = event.end
    ? (event.end.getTime() - event.start.getTime()) / (1000 * 60)
    : 60;
  const height = Math.max(30, (durationMinutes / 30) * 30);

  const handleClick = (e: React.MouseEvent) => {
    if (!isResizing) {
      e.stopPropagation();
      // Dla wyjazdów - przekieruj bezpośrednio do szczegółów
      if (event.type === "trip") {
        const tripId = event.id.replace("trip-", "");
        window.location.href = `/trips/${tripId}`;
        return;
      }
      // Dla innych typów - otwórz modal
      onClick();
    }
  };

  return (
    <div
      ref={eventRef}
      className={cn(
        "relative p-2 rounded cursor-pointer hover:opacity-90 transition-opacity",
        isResizing && "opacity-70 select-none"
      )}
      style={{
        backgroundColor: event.color + "20",
        borderLeft: `3px solid ${event.color}`,
        height: event.allDay ? "auto" : `${height}px`,
        minHeight: "30px",
      }}
      onClick={handleClick}
    >
      <div className="font-medium text-sm truncate" style={{ color: event.color }}>
        {event.title}
      </div>
      {!event.allDay && (
        <div className="text-xs text-muted-foreground">
          {format(event.start, "HH:mm")}
          {event.end && ` - ${format(event.end, "HH:mm")}`}
        </div>
      )}

      {/* Uchwyt do resize */}
      {isResizable && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/20 rounded-b flex items-center justify-center group"
          onMouseDown={handleResizeStart}
        >
          <div className="w-8 h-1 bg-muted-foreground/30 rounded group-hover:bg-primary/50 transition-colors" />
        </div>
      )}
    </div>
  );
}

// Komponent przeciągalnego wydarzenia
function DraggableEvent({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  const isDraggable = event.type === "event" || event.type === "task";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
    disabled: !isDraggable,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Dla wyjazdów - przekieruj bezpośrednio do szczegółów
    if (event.type === "trip") {
      const tripId = event.id.replace("trip-", "");
      window.location.href = `/trips/${tripId}`;
      return;
    }
    // Dla innych typów - otwórz modal
    onClick();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 flex items-center gap-1",
        isDragging && "opacity-50 z-50",
        isDraggable && "cursor-grab active:cursor-grabbing"
      )}
      onClick={handleClick}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
    >
      {isDraggable && <GripVertical className="h-3 w-3 flex-shrink-0 opacity-50" />}
      <span
        className="truncate flex-1"
        style={{ backgroundColor: event.color + "20", color: event.color, padding: "2px 4px", borderRadius: "2px" }}
      >
        {event.title}
      </span>
    </div>
  );
}

// Komponent upuszczalnego dnia
function DroppableDay({
  date,
  children,
  className,
  onClick,
}: {
  date: Date;
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: format(date, "yyyy-MM-dd"),
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "bg-primary/10 ring-2 ring-primary ring-inset")}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CalendarClient({
  events,
  tasks,
  meals,
  schedules,
  trips,
  members,
  externalBirthdays,
  anniversaries,
  importedEvents,
  currentUserId,
}: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  // Sensory dla drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimalna odległość przed rozpoczęciem przeciągania
      },
    })
  );

  // Obsługa zmiany rozmiaru wydarzenia
  const handleEventResize = useCallback(async (eventId: string, newEndDate: Date) => {
    const cleanEventId = eventId.replace("event-", "");

    try {
      const response = await fetch(`/api/events/${cleanEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endDate: newEndDate.toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Zmieniono czas trwania wydarzenia");
        window.location.reload();
      } else {
        toast.error("Nie udało się zmienić czasu trwania");
      }
    } catch (error) {
      console.error("Error resizing event:", error);
      toast.error("Wystąpił błąd");
    }
  }, []);

  // Obsługa przeciągania
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const eventData = active.data.current?.event as CalendarEvent | undefined;
    if (eventData) {
      setActiveEvent(eventData);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (!over) return;

    const draggedEvent = active.data.current?.event as CalendarEvent | undefined;
    const targetDate = over.data.current?.date as Date | undefined;

    if (!draggedEvent || !targetDate) return;

    // Nie pozwól na przeciąganie urodzin i świąt
    if (draggedEvent.type === "birthday" || draggedEvent.type === "holiday") {
      toast.error("Nie można przesuwać urodzin ani świąt");
      return;
    }

    // Sprawdź czy data się zmieniła
    if (isSameDay(draggedEvent.start, targetDate)) return;

    // Oblicz różnicę dni
    const daysDiff = differenceInDays(targetDate, startOfDay(draggedEvent.start));

    try {
      if (draggedEvent.type === "event") {
        // Aktualizuj wydarzenie
        const eventId = draggedEvent.id.replace("event-", "");
        const newStartDate = addDays(draggedEvent.start, daysDiff);
        const newEndDate = draggedEvent.end ? addDays(draggedEvent.end, daysDiff) : undefined;

        const response = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: newStartDate.toISOString(),
            endDate: newEndDate?.toISOString(),
          }),
        });

        if (response.ok) {
          toast.success("Przeniesiono wydarzenie");
          window.location.reload();
        } else {
          toast.error("Nie udało się przenieść wydarzenia");
        }
      } else if (draggedEvent.type === "task") {
        // Aktualizuj zadanie
        const taskId = draggedEvent.id.replace("task-", "");
        const newDueDate = addDays(draggedEvent.start, daysDiff);

        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dueDate: newDueDate.toISOString(),
          }),
        });

        if (response.ok) {
          toast.success("Przeniesiono zadanie");
          window.location.reload();
        } else {
          toast.error("Nie udało się przenieść zadania");
        }
      }
    } catch (error) {
      console.error("Error moving event:", error);
      toast.error("Wystąpił błąd");
    }
  }, []);

  // Konwertuj wszystkie dane na zunifikowany format wydarzeń
  const calendarEvents = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // Wydarzenia kalendarzowe
    events.forEach((event) => {
      allEvents.push({
        id: `event-${event.id}`,
        title: event.title,
        start: new Date(event.startDate),
        end: event.endDate ? new Date(event.endDate) : undefined,
        allDay: event.allDay,
        color: event.color || event.user?.color || "#3B82F6",
        type: "event",
        data: event,
      });
    });

    // Zadania z terminem
    tasks.forEach((task) => {
      if (task.dueDate) {
        allEvents.push({
          id: `task-${task.id}`,
          title: task.title,
          start: new Date(task.dueDate),
          allDay: !task.dueTime,
          color: task.category?.color || task.assignee?.color || "#6B7280",
          type: "task",
          data: task,
        });
      }
    });

    // Posiłki
    meals.forEach((meal) => {
      allEvents.push({
        id: `meal-${meal.id}`,
        title: meal.recipe?.name || meal.customName || mealTypeLabels[meal.mealType],
        start: new Date(meal.date),
        allDay: true,
        color: mealTypeColors[meal.mealType] || "#10B981",
        type: "meal",
        data: meal,
      });
    });

    // Wyjazdy
    trips.forEach((trip) => {
      const organizerColor = trip.participants[0]?.user?.color || "#EC4899";
      allEvents.push({
        id: `trip-${trip.id}`,
        title: `🧳 ${trip.name}`,
        start: new Date(trip.startDate),
        end: new Date(trip.endDate),
        allDay: true,
        color: organizerColor,
        type: "trip",
        data: trip,
      });
    });

    // Harmonogramy pracy/szkoły - generuj wystąpienia dla widocznego miesiąca
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const viewStart = startOfWeek(monthStart, { locale: pl });
    const viewEnd = endOfWeek(monthEnd, { locale: pl });

    // Urodziny domowników i zewnętrzne
    const birthdays = generateBirthdayEventsForRange(members, viewStart, viewEnd);
    birthdays.forEach((birthday) => {
      allEvents.push({
        id: birthday.id,
        title: `🎂 ${birthday.name} (${birthday.age} lat)`,
        start: birthday.date,
        allDay: true,
        color: birthday.color,
        type: "birthday",
        data: {
          userId: birthday.userId,
          age: birthday.age,
        },
      });
    });

    // Zewnętrzne urodziny (osoby spoza gospodarstwa)
    const externalBirthdayEvents = externalBirthdays.map((eb) => {
      const birthDate = new Date(eb.birthDate);
      const year = currentDate.getFullYear();
      const birthdayThisYear = new Date(year, birthDate.getMonth(), birthDate.getDate());
      const age = year - birthDate.getFullYear();

      // Sprawdź czy urodziny są w widocznym zakresie
      if (birthdayThisYear >= viewStart && birthdayThisYear <= viewEnd) {
        return {
          id: `external-birthday-${eb.id}-${year}`,
          title: `🎂 ${eb.name}${eb.relationship ? ` (${eb.relationship})` : ""} - ${age} lat`,
          start: birthdayThisYear,
          allDay: true,
          color: eb.color,
          type: "birthday" as const,
          data: {
            userId: eb.id,
            age,
            isExternal: true,
            relationship: eb.relationship,
          },
        };
      }
      return null;
    }).filter((e): e is NonNullable<typeof e> => e !== null);

    allEvents.push(...externalBirthdayEvents);

    // Święta
    const holidays = getHolidaysForRange(viewStart, viewEnd);
    holidays.forEach((holiday) => {
      allEvents.push({
        id: `holiday-${holiday.name}-${holiday.date.getFullYear()}`,
        title: holiday.name,
        start: holiday.date,
        allDay: true,
        color: holiday.color,
        type: "holiday",
        data: {
          holidayType: holiday.type,
          description: holiday.description,
        },
      });
    });

    // Rocznice
    anniversaries.forEach((anniversary) => {
      const annivDate = new Date(anniversary.date);
      const year = currentDate.getFullYear();
      const anniversaryThisYear = new Date(year, annivDate.getMonth(), annivDate.getDate());

      // Sprawdź czy rocznica jest w widocznym zakresie
      if (anniversaryThisYear >= viewStart && anniversaryThisYear <= viewEnd) {
        const yearsAgo = year - annivDate.getFullYear();
        allEvents.push({
          id: `anniversary-${anniversary.id}-${year}`,
          title: `${anniversary.title}${yearsAgo > 0 ? ` (${yearsAgo} lat)` : ""}`,
          start: anniversaryThisYear,
          allDay: true,
          color: anniversary.color || "#FF1493",
          type: "anniversary",
          data: {
            anniversaryType: anniversary.type,
          },
        });
      }
    });

    // Imieniny członków gospodarstwa
    members.forEach((member) => {
      if (member.nameDay) {
        const [day, month] = member.nameDay.split("-").map(Number);
        const year = currentDate.getFullYear();
        const nameDayThisYear = new Date(year, month - 1, day);

        // Sprawdź czy imieniny są w widocznym zakresie
        if (nameDayThisYear >= viewStart && nameDayThisYear <= viewEnd) {
          allEvents.push({
            id: `nameday-${member.id}-${year}`,
            title: `🎊 Imieniny ${member.name}`,
            start: nameDayThisYear,
            allDay: true,
            color: member.color || "#9333EA",
            type: "nameday",
            data: {
              userId: member.id,
            },
          });
        }
      }
    });

    // Zaimportowane wydarzenia z integracji kalendarzowych
    importedEvents.forEach((event) => {
      const eventStart = new Date(event.startDate);

      // Sprawdź czy wydarzenie jest w widocznym zakresie
      if (eventStart >= viewStart && eventStart <= viewEnd) {
        allEvents.push({
          id: `imported-${event.id}`,
          title: `🔗 ${event.title}`,
          start: eventStart,
          end: event.endDate ? new Date(event.endDate) : undefined,
          allDay: event.isAllDay,
          color: "#6366F1", // Indigo dla zaimportowanych
          type: "imported",
          data: {
            description: event.description || undefined,
            integrationName: event.integration.name || undefined,
            integrationType: event.integration.type,
          },
        });
      }
    });

    schedules.forEach((schedule) => {
      if (!schedule.isActive) return;

      // Sprawdź czy to jednorazowe zajęcie
      if (schedule.isOneTime && schedule.oneTimeDate) {
        const oneTimeDate = new Date(schedule.oneTimeDate);
        const oneTimeDateOnly = startOfDay(oneTimeDate);

        // Sprawdź czy data jednorazowego zajęcia mieści się w widocznym zakresie
        if (oneTimeDateOnly >= viewStart && oneTimeDateOnly <= viewEnd) {
          // Parsuj godziny
          const [startHour, startMin] = schedule.startTime.split(":").map(Number);
          const [endHour, endMin] = schedule.endTime.split(":").map(Number);

          const eventStart = new Date(oneTimeDateOnly);
          eventStart.setHours(startHour, startMin, 0, 0);

          const eventEnd = new Date(oneTimeDateOnly);
          eventEnd.setHours(endHour, endMin, 0, 0);

          const scheduleTypeIcons: Record<string, string> = {
            WORK: "💼",
            SCHOOL: "🎒",
            UNIVERSITY: "🎓",
            COURSE: "📚",
            OTHER: "📅",
          };

          allEvents.push({
            id: `schedule-${schedule.id}-${format(oneTimeDateOnly, "yyyy-MM-dd")}`,
            title: `${scheduleTypeIcons[schedule.type] || "📅"} ${schedule.name}`,
            start: eventStart,
            end: eventEnd,
            allDay: false,
            color: schedule.color || schedule.user.color || "#6366F1",
            type: "schedule",
            data: schedule,
          });
        }
        // WAŻNE: Zakończ przetwarzanie tego harmonogramu (jednorazowe zajęcie)
        return;
      }

      // UWAGA: Ten kod wykonuje się TYLKO dla cyklicznych harmonogramów (isOneTime === false)

      // Dla cyklicznych harmonogramów - iteruj przez każdy dzień w widocznym zakresie
      let day = viewStart;
      while (day <= viewEnd) {
        const dayOfWeek = day.getDay(); // 0 = niedziela, 1 = poniedziałek, etc.

        // Sprawdź czy harmonogram obowiązuje w tym dniu tygodnia
        if (schedule.dayOfWeek.includes(dayOfWeek)) {
          // Sprawdź czy nie ma wyjątku na ten dzień
          const hasException = schedule.exceptions?.some(
            (exc) => isSameDay(new Date(exc.date), day)
          );

          if (!hasException) {
            // Parsuj godziny
            const [startHour, startMin] = schedule.startTime.split(":").map(Number);
            const [endHour, endMin] = schedule.endTime.split(":").map(Number);

            const eventStart = new Date(day);
            eventStart.setHours(startHour, startMin, 0, 0);

            const eventEnd = new Date(day);
            eventEnd.setHours(endHour, endMin, 0, 0);

            const scheduleTypeIcons: Record<string, string> = {
              WORK: "💼",
              SCHOOL: "🎒",
              UNIVERSITY: "🎓",
              COURSE: "📚",
              OTHER: "📅",
            };

            allEvents.push({
              id: `schedule-${schedule.id}-${format(day, "yyyy-MM-dd")}`,
              title: `${scheduleTypeIcons[schedule.type] || "📅"} ${schedule.name}`,
              start: eventStart,
              end: eventEnd,
              allDay: false,
              color: schedule.color || schedule.user.color || "#6366F1",
              type: "schedule",
              data: schedule,
            });
          }
        }
        day = addDays(day, 1);
      }
    });

    return allEvents;
  }, [events, tasks, meals, trips, schedules, members, externalBirthdays, anniversaries, importedEvents, currentDate]);

  // Funkcje nawigacji
  const goToToday = () => setCurrentDate(new Date());

  const goToPrevious = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const goToNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  // Pobierz wydarzenia dla konkretnego dnia
  const getEventsForDay = (date: Date) => {
    return calendarEvents.filter((event) => {
      // Dla wydarzeń bez daty końcowej - sprawdź tylko datę rozpoczęcia
      if (!event.end) {
        return isSameDay(event.start, date);
      }
      // Dla wydarzeń wielodniowych - sprawdź czy data jest w zakresie
      const eventStartDay = startOfDay(event.start);
      const eventEndDay = startOfDay(event.end);
      const checkDay = startOfDay(date);
      return checkDay >= eventStartDay && checkDay <= eventEndDay;
    });
  };

  // Generuj dni dla widoku miesięcznego
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { locale: pl });
    const end = endOfWeek(endOfMonth(currentDate), { locale: pl });
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // Generuj dni dla widoku tygodniowego
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: pl });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Tytuł nagłówka
  const headerTitle = useMemo(() => {
    if (view === "month") {
      return format(currentDate, "LLLL yyyy", { locale: pl });
    } else if (view === "week") {
      const start = startOfWeek(currentDate, { locale: pl });
      const end = endOfWeek(currentDate, { locale: pl });
      return `${format(start, "d MMM", { locale: pl })} - ${format(end, "d MMM yyyy", { locale: pl })}`;
    } else {
      return format(currentDate, "EEEE, d MMMM yyyy", { locale: pl });
    }
  }, [currentDate, view]);

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
      {/* Nagłówki dni tygodnia */}
      {["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"].map((day) => (
        <div
          key={day}
          className="bg-card p-2 text-center text-sm font-medium text-muted-foreground"
        >
          {day}
        </div>
      ))}

      {/* Dni miesiąca */}
      {monthDays.map((day, idx) => {
        const dayEvents = getEventsForDay(day);
        const isCurrentMonth = isSameMonth(day, currentDate);

        return (
          <DroppableDay
            key={idx}
            date={day}
            className={cn(
              "bg-card min-h-[100px] p-1 cursor-pointer hover:bg-accent/50 transition-colors",
              !isCurrentMonth && "opacity-40"
            )}
            onClick={() => setSelectedDate(day)}
          >
            <div
              className={cn(
                "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <DraggableEvent
                  key={event.id}
                  event={event}
                  onClick={() => setSelectedEvent(event)}
                />
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{dayEvents.length - 3} więcej
                </div>
              )}
            </div>
          </DroppableDay>
        );
      })}
    </div>
  );

  const renderWeekView = () => (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day, idx) => {
        const dayEvents = getEventsForDay(day);

        return (
          <Card
            key={idx}
            className={cn(
              "min-h-[400px] cursor-pointer hover:shadow-md transition-shadow",
              isToday(day) && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedDate(day)}
          >
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex flex-col items-center">
                <span className="text-muted-foreground">
                  {format(day, "EEE", { locale: pl })}
                </span>
                <span
                  className={cn(
                    "text-2xl w-10 h-10 flex items-center justify-center rounded-full",
                    isToday(day) && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {dayEvents.map((event) => (
                <ResizableEvent
                  key={event.id}
                  event={event}
                  onClick={() => setSelectedEvent(event)}
                  onResize={handleEventResize}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span
              className={cn(
                "text-3xl w-12 h-12 flex items-center justify-center rounded-full",
                isToday(currentDate) && "bg-primary text-primary-foreground"
              )}
            >
              {format(currentDate, "d")}
            </span>
            <div>
              <div>{format(currentDate, "EEEE", { locale: pl })}</div>
              <div className="text-sm text-muted-foreground">
                {format(currentDate, "MMMM yyyy", { locale: pl })}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak wydarzeń na ten dzień
            </div>
          ) : (
            dayEvents.map((event) => (
              <ResizableEvent
                key={event.id}
                event={event}
                onClick={() => setSelectedEvent(event)}
                onResize={handleEventResize}
              />
            ))
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kalendarz</h1>
            <p className="text-muted-foreground">
              Wszystkie wydarzenia w jednym miejscu
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Eksport i Synchronizacja
            </Button>
            <Button onClick={() => setIsEventFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nowe wydarzenie
            </Button>
          </div>
        </div>

        {/* Nawigacja i widoki */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Dziś
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold ml-2 capitalize">{headerTitle}</h2>
          </div>

          <div className="flex items-center gap-2">
            <Select value={view} onValueChange={(v) => setView(v as ViewType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">
                  <span className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Miesiąc
                  </span>
                </SelectItem>
                <SelectItem value="week">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Tydzień
                  </span>
                </SelectItem>
                <SelectItem value="day">
                <span className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Dzień
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Wydarzenia</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span>Zadania</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Posiłki</span>
        </div>
      </div>

      {/* Widok kalendarza */}
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}

      {/* Modal szczegółów dnia */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "EEEE, d MMMM yyyy", { locale: pl })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selectedDate && getEventsForDay(selectedDate).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Brak wydarzeń na ten dzień
              </div>
            ) : (
              selectedDate &&
              getEventsForDay(selectedDate).map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: event.color + "20",
                    borderLeft: `4px solid ${event.color}`,
                  }}
                  onClick={() => {
                    setSelectedDate(null);
                    // Dla wyjazdów - przekieruj bezpośrednio
                    if (event.type === "trip") {
                      const tripId = event.id.replace("trip-", "");
                      window.location.href = `/trips/${tripId}`;
                      return;
                    }
                    // Dla innych typów - otwórz modal
                    setSelectedEvent(event);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{event.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {event.type === "task" && "Zadanie"}
                      {event.type === "event" && "Wydarzenie"}
                      {event.type === "meal" && "Posiłek"}
                      {event.type === "birthday" && "🎂"}
                      {event.type === "holiday" && "🎉"}
                      {event.type === "schedule" && "📅"}
                      {event.type === "trip" && "🧳"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button
            className="w-full mt-2"
            onClick={() => {
              setSelectedDate(null);
              setIsEventFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj wydarzenie
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modal szczegółów wydarzenia */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  style={{
                    backgroundColor: selectedEvent.color + "20",
                    color: selectedEvent.color,
                  }}
                >
                  {selectedEvent.type === "task" && "Zadanie"}
                  {selectedEvent.type === "event" && "Wydarzenie"}
                  {selectedEvent.type === "meal" && "Posiłek"}
                  {selectedEvent.type === "schedule" && "Harmonogram"}
                  {selectedEvent.type === "trip" && "🧳 Wyjazd"}
                  {selectedEvent.type === "birthday" && "🎂 Urodziny"}
                  {selectedEvent.type === "holiday" && "🎉 Święto"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <CalendarIcon className="inline h-4 w-4 mr-2" />
                {format(selectedEvent.start, "EEEE, d MMMM yyyy", { locale: pl })}
                {!selectedEvent.allDay && ` o ${format(selectedEvent.start, "HH:mm")}`}
              </div>
              {selectedEvent.type === "birthday" && selectedEvent.data && (
                <div className="text-sm space-y-2">
                  <p>🎂 Urodziny członka rodziny!</p>
                  {(selectedEvent.data as { age?: number }).age && (
                    <p className="font-medium">
                      Wiek: {(selectedEvent.data as { age: number }).age} lat
                    </p>
                  )}
                </div>
              )}
              {selectedEvent.type === "holiday" && selectedEvent.data && (
                <div className="text-sm space-y-2">
                  <p>
                    {(selectedEvent.data as { holidayType?: string }).holidayType === "public" && "🏛️ Święto państwowe (dzień wolny)"}
                    {(selectedEvent.data as { holidayType?: string }).holidayType === "religious" && "✝️ Święto religijne"}
                    {(selectedEvent.data as { holidayType?: string }).holidayType === "observance" && "📅 Obchody"}
                  </p>
                  {(selectedEvent.data as { description?: string }).description && (
                    <p className="text-muted-foreground">{(selectedEvent.data as { description: string }).description}</p>
                  )}
                </div>
              )}
              {selectedEvent.type === "task" && (selectedEvent.data as TaskWithRelations).description && (
                <p className="text-sm">{(selectedEvent.data as TaskWithRelations).description}</p>
              )}
              {selectedEvent.type === "meal" && (
                <div className="text-sm">
                  <strong>Typ posiłku:</strong> {mealTypeLabels[(selectedEvent.data as MealWithRecipe).mealType]}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Formularz nowego wydarzenia */}
      <EventFormDialog
        open={isEventFormOpen}
        onOpenChange={setIsEventFormOpen}
        members={members}
        defaultDate={selectedDate || undefined}
      />

      {/* Drag Overlay - podgląd przeciąganego elementu */}
      <DragOverlay>
        {activeEvent && (
          <div
            className="text-xs p-2 rounded shadow-lg"
            style={{
              backgroundColor: activeEvent.color,
              color: "white",
            }}
          >
            {activeEvent.title}
          </div>
        )}
      </DragOverlay>

      {/* Dialog eksportu i synchronizacji */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Eksport i Automatyczna Synchronizacja Kalendarza
            </DialogTitle>
          </DialogHeader>
          <CalendarExport />
        </DialogContent>
      </Dialog>
    </div>
    </DndContext>
  );
}

