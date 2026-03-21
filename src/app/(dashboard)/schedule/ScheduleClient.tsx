"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Clock,
  MapPin,
  Briefcase,
  GraduationCap,
  MoreVertical,
  Trash2,
  AlertTriangle,
  CalendarOff,
  CalendarPlus,
  BookOpen,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import type { Schedule, ScheduleException } from "@prisma/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { scheduleTemplates, type ScheduleTemplate } from "@/lib/schedule-templates";
import { doesScheduleOccurOnDate, parseSpecificDatesInput } from "@/lib/schedule-occurrence";

type ScheduleWithUser = Schedule & {
  user: {
    id: string;
    name: string | null;
    color: string;
  };
  exceptions: ScheduleException[];
};

type Member = {
  id: string;
  name: string | null;
  color: string;
};

interface ScheduleClientProps {
  schedules: ScheduleWithUser[];
  members: Member[];
  currentUserId: string;
}

type RecurrenceUnit = "WEEKLY" | "MONTHLY";

type ScheduleFormState = {
  name: string;
  type: string;
  userId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  isOneTime: boolean;
  oneTimeDate: string;
  recurrenceUnit: RecurrenceUnit;
  repeatEvery: number;
  effectiveFrom: string;
  effectiveTo: string;
  specificDatesInput: string;
};

function createDefaultScheduleState(currentUserId: string): ScheduleFormState {
  return {
    name: "",
    type: "WORK",
    userId: currentUserId,
    daysOfWeek: [],
    startTime: "09:00",
    endTime: "17:00",
    location: "",
    isOneTime: false,
    oneTimeDate: "",
    recurrenceUnit: "WEEKLY",
    repeatEvery: 1,
    effectiveFrom: "",
    effectiveTo: "",
    specificDatesInput: "",
  };
}

function datesInputToCalendarSelection(input: string): Date[] {
  return parseSpecificDatesInput(input).map((date) => new Date(`${date}T00:00:00`));
}

function calendarSelectionToDatesInput(dates: Date[] | undefined): string {
  if (!dates || dates.length === 0) return "";

  const normalized = dates
    .map((date) => format(date, "yyyy-MM-dd"))
    .join("\n");

  return parseSpecificDatesInput(normalized).join("\n");
}

const daysOfWeek = [
  { value: 0, label: "Niedziela", short: "Nd" },
  { value: 1, label: "Poniedziałek", short: "Pn" },
  { value: 2, label: "Wtorek", short: "Wt" },
  { value: 3, label: "Środa", short: "Śr" },
  { value: 4, label: "Czwartek", short: "Cz" },
  { value: 5, label: "Piątek", short: "Pt" },
  { value: 6, label: "Sobota", short: "So" },
];

const scheduleTypes = [
  { value: "WORK", label: "Praca", icon: Briefcase, color: "bg-blue-500" },
  { value: "SCHOOL", label: "Szkoła", icon: GraduationCap, color: "bg-purple-500" },
  { value: "UNIVERSITY", label: "Uniwersytet", icon: GraduationCap, color: "bg-indigo-500" },
  { value: "COURSE", label: "Kurs", icon: GraduationCap, color: "bg-green-500" },
  { value: "OTHER", label: "Inne", icon: Clock, color: "bg-gray-500" },
];

export function ScheduleClient({
  schedules: initialSchedules,
  members,
  currentUserId,
}: ScheduleClientProps) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedScheduleDetails, setSelectedScheduleDetails] = useState<ScheduleWithUser | null>(null);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithUser | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
  const [isExceptionsManagerOpen, setIsExceptionsManagerOpen] = useState(false);
  const [isRangeExceptionDialogOpen, setIsRangeExceptionDialogOpen] = useState(false);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [selectedScheduleForException, setSelectedScheduleForException] = useState<ScheduleWithUser | null>(null);
  const [selectedScheduleForOverride, setSelectedScheduleForOverride] = useState<ScheduleWithUser | null>(null);
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionStartDate, setExceptionStartDate] = useState("");
  const [exceptionEndDate, setExceptionEndDate] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStartTime, setOverrideStartTime] = useState("");
  const [overrideEndTime, setOverrideEndTime] = useState("");
  const [overrideLocation, setOverrideLocation] = useState("");
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Znajdź poniedziałek bieżącego tygodnia
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Jeśli niedziela, cofnij o 6 dni
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday;
  });

  const [newSchedule, setNewSchedule] = useState<ScheduleFormState>(createDefaultScheduleState(currentUserId));

  const selectedSpecificDates = useMemo(
    () => datesInputToCalendarSelection(newSchedule.specificDatesInput),
    [newSchedule.specificDatesInput]
  );

  // Filtruj harmonogramy po członku
  const filteredSchedules = schedules.filter(
    (s) => selectedMember === "all" || s.userId === selectedMember
  );

  // Funkcja do sprawdzania czy dwa zakresy czasowe się nakładają
  const timeRangesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };
    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);
    return s1 < e2 && s2 < e1;
  };

  // Wykryj kolizje dla nowego harmonogramu
  const conflicts = useMemo(() => {
    const hasSpecificDates = parseSpecificDatesInput(newSchedule.specificDatesInput).length > 0;

    if (newSchedule.isOneTime || hasSpecificDates || newSchedule.recurrenceUnit !== "WEEKLY") {
      return [];
    }

    if (newSchedule.daysOfWeek.length === 0) return [];

    const userSchedules = schedules.filter((s) => s.userId === newSchedule.userId);
    const foundConflicts: { schedule: ScheduleWithUser; day: number }[] = [];

    for (const day of newSchedule.daysOfWeek) {
      for (const schedule of userSchedules) {
        if (schedule.dayOfWeek.includes(day)) {
          if (
            timeRangesOverlap(
              newSchedule.startTime,
              newSchedule.endTime,
              schedule.startTime,
              schedule.endTime
            )
          ) {
            foundConflicts.push({ schedule, day });
          }
        }
      }
    }

    return foundConflicts;
  }, [newSchedule, schedules]);

  // Generuj dni tygodnia z konkretnymi datami
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      const dayOfWeek = date.getDay();
      const dayInfo = daysOfWeek.find(d => d.value === dayOfWeek)!;

      // Filtruj harmonogramy dla tego dnia tygodnia
      const daySchedules = filteredSchedules.filter((s) => doesScheduleOccurOnDate(s, date));

      const hasException = filteredSchedules.some((s) =>
        s.exceptions?.some((exc) => format(new Date(exc.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))
      );

      days.push({
        ...dayInfo,
        date,
        schedules: daySchedules,
        hasException,
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Oblicz godziny pracy/nauki w miesiącu per osoba
  const monthlyHours = useMemo(() => {
    const hoursPerUser: Record<string, { work: number; other: number; total: number }> = {};

    const periodStart = new Date(viewMode === "month"
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      : currentWeekStart);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(viewMode === "month"
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      : new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000));
    periodEnd.setHours(23, 59, 59, 999);

    for (const schedule of schedules) {
      if (!schedule.isActive) continue;

      const userId = schedule.userId;
      if (!hoursPerUser[userId]) {
        hoursPerUser[userId] = { work: 0, other: 0, total: 0 };
      }

      const [startH, startM] = schedule.startTime.split(":").map(Number);
      const [endH, endM] = schedule.endTime.split(":").map(Number);
      const durationHours = (endH * 60 + endM - startH * 60 - startM) / 60;

      const currentDate = new Date(periodStart);
      while (currentDate <= periodEnd) {
        if (doesScheduleOccurOnDate(schedule, currentDate)) {
          if (schedule.type === "WORK") {
            hoursPerUser[userId].work += durationHours;
          } else {
            hoursPerUser[userId].other += durationHours;
          }
          hoursPerUser[userId].total += durationHours;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return hoursPerUser;
  }, [schedules, viewMode, currentMonth, currentWeekStart]);

  const handleToggleDay = (day: number) => {
    setNewSchedule((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const handleSaveSchedule = async () => {
    if (!newSchedule.name) {
      toast.error("Wypełnij nazwę");
      return;
    }

    if (newSchedule.isOneTime && !newSchedule.oneTimeDate) {
      toast.error("Wybierz datę zajęć");
      return;
    }

    const parsedSpecificDates = parseSpecificDatesInput(newSchedule.specificDatesInput);

    if (!newSchedule.isOneTime && parsedSpecificDates.length === 0 && newSchedule.recurrenceUnit === "WEEKLY" && newSchedule.daysOfWeek.length === 0) {
      toast.error("Wybierz dni tygodnia");
      return;
    }

    if (!newSchedule.isOneTime && newSchedule.recurrenceUnit === "MONTHLY" && !newSchedule.effectiveFrom) {
      toast.error("Dla cyklu miesiecznego ustaw date rozpoczecia");
      return;
    }

    if (newSchedule.effectiveFrom && newSchedule.effectiveTo && new Date(newSchedule.effectiveFrom) > new Date(newSchedule.effectiveTo)) {
      toast.error("Data zakonczenia musi byc pozniejsza od daty rozpoczecia");
      return;
    }

    try {
      // Dla jednorazowych zajęć używamy dnia tygodnia z wybranej daty
      const daysOfWeek = newSchedule.isOneTime
        ? [new Date(newSchedule.oneTimeDate).getDay()]
        : newSchedule.daysOfWeek;

      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSchedule.name,
          type: newSchedule.type,
          userId: newSchedule.userId,
          dayOfWeek: daysOfWeek,
          startTime: newSchedule.startTime,
          endTime: newSchedule.endTime,
          location: newSchedule.location || null,
          isActive: true,
          isOneTime: newSchedule.isOneTime,
          oneTimeDate: newSchedule.isOneTime ? new Date(newSchedule.oneTimeDate).toISOString() : null,
          recurrenceUnit: newSchedule.recurrenceUnit,
          repeatEvery: newSchedule.repeatEvery,
          effectiveFrom: newSchedule.effectiveFrom ? new Date(newSchedule.effectiveFrom).toISOString() : null,
          effectiveTo: newSchedule.effectiveTo ? new Date(newSchedule.effectiveTo).toISOString() : null,
          specificDates: parsedSpecificDates,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSchedules([...schedules, result]);
        setIsAddDialogOpen(false);
        setNewSchedule(createDefaultScheduleState(currentUserId));
        toast.success(newSchedule.isOneTime ? "Jednorazowe zajęcie zostało dodane" : "Harmonogram został dodany");
      }
    } catch {
      toast.error("Nie udało się zapisać harmonogramu");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/schedule/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSchedules(schedules.filter((s) => s.id !== id));
        toast.success("Wpis został usunięty");
      }
    } catch {
      toast.error("Nie udało się usunąć wpisu");
    }
  };

  const openEditDialog = (schedule: ScheduleWithUser) => {
    setEditingSchedule(schedule);
    setNewSchedule({
      name: schedule.name,
      type: schedule.type,
      userId: schedule.userId,
      daysOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: schedule.location || "",
      isOneTime: schedule.isOneTime,
      oneTimeDate: schedule.oneTimeDate ? format(new Date(schedule.oneTimeDate), "yyyy-MM-dd") : "",
      recurrenceUnit: schedule.recurrenceUnit,
      repeatEvery: schedule.repeatEvery,
      effectiveFrom: schedule.effectiveFrom ? format(new Date(schedule.effectiveFrom), "yyyy-MM-dd") : "",
      effectiveTo: schedule.effectiveTo ? format(new Date(schedule.effectiveTo), "yyyy-MM-dd") : "",
      specificDatesInput: (schedule.specificDates || []).map((date) => format(new Date(date), "yyyy-MM-dd")).join("\n"),
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSchedule = async () => {
    if (!editingSchedule) return;

    if (!newSchedule.name || (!newSchedule.isOneTime && newSchedule.daysOfWeek.length === 0)) {
      const parsedSpecificDates = parseSpecificDatesInput(newSchedule.specificDatesInput);
      if (!newSchedule.isOneTime && parsedSpecificDates.length === 0 && newSchedule.recurrenceUnit === "WEEKLY" && newSchedule.daysOfWeek.length === 0) {
        toast.error("Wypelnij wymagane pola");
        return;
      }
    }

    const parsedSpecificDates = parseSpecificDatesInput(newSchedule.specificDatesInput);

    if (!newSchedule.isOneTime && newSchedule.recurrenceUnit === "MONTHLY" && !newSchedule.effectiveFrom) {
      toast.error("Dla cyklu miesiecznego ustaw date rozpoczecia");
      return;
    }

    if (newSchedule.effectiveFrom && newSchedule.effectiveTo && new Date(newSchedule.effectiveFrom) > new Date(newSchedule.effectiveTo)) {
      toast.error("Data zakonczenia musi byc pozniejsza od daty rozpoczecia");
      return;
    }

    try {
      const response = await fetch(`/api/schedule/${editingSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSchedule.name,
          type: newSchedule.type,
          userId: newSchedule.userId,
          dayOfWeek: newSchedule.daysOfWeek,
          startTime: newSchedule.startTime,
          endTime: newSchedule.endTime,
          location: newSchedule.location || null,
          isOneTime: newSchedule.isOneTime,
          oneTimeDate: newSchedule.isOneTime && newSchedule.oneTimeDate
            ? new Date(newSchedule.oneTimeDate).toISOString()
            : null,
          recurrenceUnit: newSchedule.recurrenceUnit,
          repeatEvery: newSchedule.repeatEvery,
          effectiveFrom: newSchedule.effectiveFrom ? new Date(newSchedule.effectiveFrom).toISOString() : null,
          effectiveTo: newSchedule.effectiveTo ? new Date(newSchedule.effectiveTo).toISOString() : null,
          specificDates: parsedSpecificDates,
        }),
      });

      if (response.ok) {
        const updatedSchedule = await response.json();
        setSchedules(schedules.map(s => s.id === editingSchedule.id ? updatedSchedule : s));
        setIsEditDialogOpen(false);
        setEditingSchedule(null);
        toast.success("Harmonogram zaktualizowany");
      } else {
        toast.error("Nie udało się zaktualizować harmonogramu");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const openExceptionDialog = (schedule: ScheduleWithUser) => {
    setSelectedScheduleForException(schedule);
    setExceptionDate("");
    setExceptionReason("");
    setIsExceptionDialogOpen(true);
  };

  const handleAddException = async () => {
    if (!selectedScheduleForException || !exceptionDate) {
      toast.error("Wybierz datę");
      return;
    }

    try {
      const response = await fetch(`/api/schedule/${selectedScheduleForException.id}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: exceptionDate,
          reason: exceptionReason || null,
        }),
      });

      if (response.ok) {
        const newException = await response.json();
        setSchedules(schedules.map((s) =>
          s.id === selectedScheduleForException.id
            ? { ...s, exceptions: [...(s.exceptions || []), newException] }
            : s
        ));
        setIsExceptionDialogOpen(false);
        toast.success("Dodano dzień wolny");
      } else {
        toast.error("Nie udało się dodać dnia wolnego");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const handleDeleteException = async (scheduleId: string, exceptionId: string) => {
    try {
      const response = await fetch(
        `/api/schedule/${scheduleId}/exceptions/${exceptionId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setSchedules(schedules.map((s) =>
          s.id === scheduleId
            ? { ...s, exceptions: s.exceptions.filter((e) => e.id !== exceptionId) }
            : s
        ));
        toast.success("Usunięto wyjątek");
      }
    } catch {
      toast.error("Nie udało się usunąć wyjątku");
    }
  };

  const handleAddRangeException = async () => {
    if (!selectedScheduleForException || !exceptionStartDate || !exceptionEndDate) {
      toast.error("Wybierz datę początkową i końcową");
      return;
    }

    const startDate = new Date(exceptionStartDate);
    const endDate = new Date(exceptionEndDate);

    if (startDate > endDate) {
      toast.error("Data początkowa musi być wcześniejsza niż końcowa");
      return;
    }

    try {
      const dates = [];
      const currentDate = new Date(startDate);

      // Generuj wszystkie daty w zakresie
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Dodaj wyjątek dla każdej daty
      const promises = dates.map(date =>
        fetch(`/api/schedule/${selectedScheduleForException.id}/exceptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: format(date, "yyyy-MM-dd"),
            reason: exceptionReason || null,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(r => r.ok);

      if (allSuccessful) {
        const newExceptions = await Promise.all(responses.map(r => r.json()));
        setSchedules(schedules.map((s) =>
          s.id === selectedScheduleForException.id
            ? { ...s, exceptions: [...(s.exceptions || []), ...newExceptions] }
            : s
        ));
        setIsRangeExceptionDialogOpen(false);
        toast.success(`Dodano ${dates.length} dni wolnych`);
      } else {
        toast.error("Nie udało się dodać wszystkich dni wolnych");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const openOverrideDialog = (schedule: ScheduleWithUser, date: Date) => {
    setSelectedScheduleForOverride(schedule);
    setOverrideDate(format(date, "yyyy-MM-dd"));
    setOverrideStartTime(schedule.startTime);
    setOverrideEndTime(schedule.endTime);
    setOverrideLocation(schedule.location || "");
    setIsOverrideDialogOpen(true);
  };

  const handleSaveOverride = async () => {
    if (!selectedScheduleForOverride || !overrideDate) {
      toast.error("Wybierz datę");
      return;
    }

    try {
      // Dodaj wyjątek dla oryginalnego harmonogramu
      const response = await fetch(`/api/schedule/${selectedScheduleForOverride.id}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: overrideDate,
          reason: `Zmiana: ${overrideStartTime}-${overrideEndTime}`,
        }),
      });

      if (response.ok) {
        // Dodaj nowy harmonogram na ten konkretny dzień
        const overrideResponse = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${selectedScheduleForOverride.name} (${format(new Date(overrideDate), "d MMM", { locale: pl })})`,
            type: selectedScheduleForOverride.type,
            userId: selectedScheduleForOverride.userId,
            dayOfWeek: [new Date(overrideDate).getDay()],
            startTime: overrideStartTime,
            endTime: overrideEndTime,
            location: overrideLocation || null,
            isActive: true,
          }),
        });

        if (overrideResponse.ok) {
          const newException = await response.json();
          const newOverride = await overrideResponse.json();

          setSchedules([
            ...schedules.map((s) =>
              s.id === selectedScheduleForOverride.id
                ? { ...s, exceptions: [...(s.exceptions || []), newException] }
                : s
            ),
            newOverride,
          ]);

          setIsOverrideDialogOpen(false);
          toast.success("Zmieniono harmonogram na ten dzień");
        }
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  // Generuj dni w miesiącu z harmonogramem
  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Znajdź pierwszy dzień tygodnia (poniedziałek = 0)
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days: Array<{
      date: Date | null;
      dayOfMonth: number | null;
      isCurrentMonth: boolean;
      schedules: ScheduleWithUser[];
      hasException: boolean;
    }> = [];

    // Dodaj puste dni z poprzedniego miesiąca
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, dayOfMonth: null, isCurrentMonth: false, schedules: [], hasException: false });
    }

    // Dodaj dni bieżącego miesiąca
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);

      // Znajdz harmonogramy dla tej daty
      const daySchedules = filteredSchedules.filter((s) => doesScheduleOccurOnDate(s, date));

      const hasException = filteredSchedules.some((s) =>
        s.exceptions?.some(
          (exc) => format(new Date(exc.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
        )
      );

      days.push({
        date,
        dayOfMonth: day,
        isCurrentMonth: true,
        schedules: daySchedules,
        hasException,
      });
    }

    return days;
  };

  const handleApplyTemplate = async (template: ScheduleTemplate) => {
    try {
      const promises = template.schedules.map((scheduleData) =>
        fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: scheduleData.name,
            type: template.type,
            userId: newSchedule.userId,
            dayOfWeek: scheduleData.daysOfWeek,
            startTime: scheduleData.startTime,
            endTime: scheduleData.endTime,
            location: scheduleData.location || null,
            color: scheduleData.color || null,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const newSchedules = await Promise.all(
        responses.map((r) => r.json())
      );

      setSchedules([...schedules, ...newSchedules]);
      setIsTemplateDialogOpen(false);
      toast.success(`Dodano szablon: ${template.name}`);
    } catch {
      toast.error("Nie udało się zastosować szablonu");
    }
  };

  const getTypeInfo = (type: string) => {
    return scheduleTypes.find((t) => t.value === type) || scheduleTypes[4];
  };

  const openDetailsDialog = (schedule: ScheduleWithUser, date?: Date) => {
    setSelectedScheduleDetails(schedule);
    setSelectedScheduleDate(date ?? null);
    setIsDetailsDialogOpen(true);
  };

  const getRecurrenceLabel = (schedule: ScheduleWithUser) => {
    if (schedule.isOneTime) {
      return schedule.oneTimeDate
        ? `Jednorazowe: ${format(new Date(schedule.oneTimeDate), "d MMM yyyy", { locale: pl })}`
        : "Jednorazowe";
    }

    const specificDatesCount = schedule.specificDates?.length || 0;
    if (specificDatesCount > 0) {
      return `Konkretne daty: ${specificDatesCount}`;
    }

    if (schedule.recurrenceUnit === "MONTHLY") {
      return `Co ${schedule.repeatEvery} mies.`;
    }

    const dayShort = schedule.dayOfWeek
      .map((day) => daysOfWeek.find((d) => d.value === day)?.short)
      .filter(Boolean)
      .join(", ");

    return `Co ${schedule.repeatEvery} tyg.${dayShort ? ` (${dayShort})` : ""}`;
  };

  const handleOpenEditFromDetails = () => {
    if (!selectedScheduleDetails) return;
    setIsDetailsDialogOpen(false);
    openEditDialog(selectedScheduleDetails);
  };

  const handleOpenExceptionFromDetails = () => {
    if (!selectedScheduleDetails) return;

    setSelectedScheduleForException(selectedScheduleDetails);
    setExceptionDate(
      selectedScheduleDate ? format(selectedScheduleDate, "yyyy-MM-dd") : ""
    );
    setExceptionReason("");
    setIsDetailsDialogOpen(false);
    setIsExceptionDialogOpen(true);
  };

  const handleDeleteFromDetails = async () => {
    if (!selectedScheduleDetails) return;

    const scheduleId = selectedScheduleDetails.id;
    setIsDetailsDialogOpen(false);
    await handleDeleteSchedule(scheduleId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Harmonogram</h1>
          <p className="text-muted-foreground">
            Planuj pracę i zajęcia szkolne
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Tydzień
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Miesiąc
            </Button>
          </div>
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Wszyscy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Szablony
          </Button>
          <Button variant="outline" onClick={() => setIsExceptionsManagerOpen(true)}>
            <CalendarOff className="mr-2 h-4 w-4" />
            Zarządzaj dniami wolnymi
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj harmonogram
          </Button>
        </div>
      </div>

      {/* Statystyki godzin miesięcznych */}
      {Object.keys(monthlyHours).length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {members
            .filter((m) => selectedMember === "all" || m.id === selectedMember)
            .filter((m) => monthlyHours[m.id])
            .map((member) => {
              const hours = monthlyHours[member.id];
              return (
                <Card key={member.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          style={{ backgroundColor: member.color }}
                          className="text-white text-xs"
                        >
                          {member.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-sm font-medium">
                        {member.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {hours.total.toFixed(0)}h
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {hours.work > 0 && (
                        <span className="inline-flex items-center gap-1 mr-3">
                          <Briefcase className="h-3 w-3" />
                          {hours.work.toFixed(0)}h pracy
                        </span>
                      )}
                      {hours.other > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {hours.other.toFixed(0)}h nauki
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Widok tygodniowy */}
      {viewMode === "week" && (
        <div className="space-y-4">
          {/* Nawigacja tygodnia */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(currentWeekStart);
                  newDate.setDate(currentWeekStart.getDate() - 7);
                  setCurrentWeekStart(newDate);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const dayOfWeek = today.getDay();
                  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                  const monday = new Date(today);
                  monday.setDate(today.getDate() + diff);
                  setCurrentWeekStart(monday);
                }}
              >
                Dzisiaj
              </Button>
            </div>
            <h2 className="text-lg font-semibold">
              {format(currentWeekStart, "d MMM", { locale: pl })} - {format(new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000), "d MMM yyyy", { locale: pl })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(currentWeekStart);
                newDate.setDate(currentWeekStart.getDate() + 7);
                setCurrentWeekStart(newDate);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-7">
            {weekDays.map((day) => (
              <Card
                key={day.value}
                className={cn(
                  "min-h-[200px]",
                  day.date.toDateString() === new Date().toDateString() && "border-primary border-2",
                  day.hasException && "border-orange-500"
                )}
              >
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-center">
                    <div>{day.label}</div>
                    <div className={cn(
                      "text-xs font-normal text-muted-foreground mt-1",
                      day.date.toDateString() === new Date().toDateString() && "text-primary font-semibold"
                    )}>
                      {format(day.date, "d MMM", { locale: pl })}
                    </div>
                  </CardTitle>
                </CardHeader>
            <CardContent className="p-2 space-y-2">
              {day.schedules.length === 0 ? (
                <div className="flex flex-col items-center py-4 gap-2">
                  <div className="text-center text-muted-foreground text-xs">
                    Brak zajęć
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setNewSchedule({
                        ...newSchedule,
                        isOneTime: true,
                        oneTimeDate: format(day.date, "yyyy-MM-dd"),
                      });
                      setIsAddDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Dodaj
                  </Button>
                </div>
              ) : (
                <>
                  {day.schedules.map((schedule) => {
                    const typeInfo = getTypeInfo(schedule.type);
                    const TypeIcon = typeInfo.icon;

                    return (
                      <div
                        key={schedule.id}
                        onClick={() => openDetailsDialog(schedule, day.date)}
                        className={cn(
                          "p-2 rounded-lg text-white text-xs cursor-pointer hover:brightness-95 transition",
                          typeInfo.color
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <TypeIcon className="h-3 w-3" />
                            <span className="font-medium truncate">{schedule.name}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-white hover:bg-white/20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditDialog(schedule)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edytuj harmonogram
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openOverrideDialog(schedule, day.date)}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Zmień na ten dzień
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openExceptionDialog(schedule)}
                              >
                                <CalendarOff className="mr-2 h-4 w-4" />
                                Dodaj dzień wolny
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Usuń
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-1 mt-1 opacity-90">
                          <Clock className="h-3 w-3" />
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                        {schedule.location && (
                          <div className="flex items-center gap-1 mt-1 opacity-90">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{schedule.location}</span>
                          </div>
                        )}
                        <div className="mt-1">
                          <Avatar className="h-4 w-4 inline-block">
                            <AvatarFallback
                              style={{ backgroundColor: schedule.user.color }}
                              className="text-white text-[8px]"
                            >
                              {schedule.user.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    );
                  })}

                  {/* Przycisk dodaj kolejny harmonogram */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-7 mt-1"
                    onClick={() => {
                      setNewSchedule({
                        ...newSchedule,
                        isOneTime: true,
                        oneTimeDate: format(day.date, "yyyy-MM-dd"),
                      });
                      setIsAddDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Dodaj kolejny
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
          </div>
        </div>
      )}

      {/* Widok miesięczny */}
      {viewMode === "month" && (
        <div className="space-y-4">
          {/* Nawigacja miesiąca */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Dzisiaj
              </Button>
            </div>
            <h2 className="text-lg font-semibold">
              {format(currentMonth, "LLLL yyyy", { locale: pl })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Kalendarz miesięczny */}
          <div className="grid grid-cols-7 gap-2">
            {/* Nagłówki dni tygodnia */}
            {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}

            {/* Dni miesiąca */}
            {getMonthDays().map((day, idx) => (
              <Card
                key={idx}
                className={cn(
                  "min-h-[100px] p-2",
                  !day.isCurrentMonth && "opacity-40",
                  day.hasException && "border-orange-500"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    day.date && day.date.toDateString() === new Date().toDateString() && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                  )}>
                    {day.dayOfMonth || ""}
                  </span>
                  <div className="flex items-center gap-1">
                    {day.hasException && (
                      <CalendarOff className="h-3 w-3 text-orange-500" />
                    )}
                    {/* Szybkie dodanie dnia wolnego */}
                    {day.date && day.schedules.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-muted"
                          >
                            <CalendarPlus className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              // Dodaj dzień wolny dla wszystkich harmonogramów tego dnia
                              if (day.schedules.length > 0) {
                                setSelectedScheduleForException(day.schedules[0]);
                                setExceptionDate(format(day.date!, "yyyy-MM-dd"));
                                setExceptionReason("");
                                setIsExceptionDialogOpen(true);
                              }
                            }}
                          >
                            <CalendarOff className="mr-2 h-4 w-4" />
                            Dodaj dzień wolny
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {day.date && (
                  <div className="space-y-1">
                    {day.schedules.length === 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[10px] h-6 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setNewSchedule({
                            ...newSchedule,
                            isOneTime: true,
                            oneTimeDate: format(day.date!, "yyyy-MM-dd"),
                          });
                          setIsAddDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Dodaj
                      </Button>
                    ) : (
                      <>
                        {day.schedules.slice(0, 2).map((schedule) => {
                          const typeInfo = getTypeInfo(schedule.type);
                          return (
                            <div key={schedule.id} className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openDetailsDialog(schedule, day.date!)}
                                className={cn(
                                  "text-[10px] p-1 rounded text-white truncate w-full text-left hover:brightness-95 transition",
                                  typeInfo.color
                                )}
                              >
                                {schedule.startTime} {schedule.name}
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => openDetailsDialog(schedule, day.date!)}>
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    Szczegóły
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditDialog(schedule)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edytuj harmonogram
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => day.date && openOverrideDialog(schedule, day.date)}>
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Zmień na ten dzień
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openExceptionDialog(schedule)}>
                                    <CalendarOff className="mr-2 h-4 w-4" />
                                    Dzień wolny
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Usuń harmonogram
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          );
                        })}
                        {day.schedules.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{day.schedules.length - 2} więcej
                          </div>
                        )}
                        {/* Przycisk dodaj kolejny w widoku miesięcznym */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-[10px] h-5 mt-1"
                          onClick={() => {
                            setNewSchedule({
                              ...newSchedule,
                              isOneTime: true,
                              oneTimeDate: format(day.date!, "yyyy-MM-dd"),
                            });
                            setIsAddDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Dodaj
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog dodawania */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Nowy harmonogram</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Nazwa</Label>
              <Input
                placeholder="Np. Praca w biurze"
                value={newSchedule.name}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={newSchedule.type}
                  onValueChange={(v) =>
                    setNewSchedule({ ...newSchedule, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Osoba</Label>
                <Select
                  value={newSchedule.userId}
                  onValueChange={(v) =>
                    setNewSchedule({ ...newSchedule, userId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Typ harmonogramu</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="one-time" className="text-sm font-normal cursor-pointer">
                    Jednorazowe zajęcie
                  </Label>
                  <input
                    id="one-time"
                    type="checkbox"
                    checked={newSchedule.isOneTime}
                    onChange={(e) => setNewSchedule({
                      ...newSchedule,
                      isOneTime: e.target.checked,
                      daysOfWeek: e.target.checked ? [] : newSchedule.daysOfWeek
                    })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>

              {newSchedule.isOneTime ? (
                <div className="space-y-2">
                  <Label>Data zajęć</Label>
                  <Input
                    type="date"
                    value={newSchedule.oneTimeDate}
                    onChange={(e) => setNewSchedule({ ...newSchedule, oneTimeDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Zajęcia odbędą się tylko tego jednego dnia
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Powtarzanie</Label>
                      <Select
                        value={newSchedule.recurrenceUnit}
                        onValueChange={(value) =>
                          setNewSchedule({
                            ...newSchedule,
                            recurrenceUnit: value as RecurrenceUnit,
                            daysOfWeek: value === "MONTHLY" ? [] : newSchedule.daysOfWeek,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEKLY">Tygodniowo</SelectItem>
                          <SelectItem value="MONTHLY">Miesiecznie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Co ile</Label>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={newSchedule.repeatEvery}
                        onChange={(e) =>
                          setNewSchedule({
                            ...newSchedule,
                            repeatEvery: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Obowiazuje od</Label>
                      <Input
                        type="date"
                        value={newSchedule.effectiveFrom}
                        onChange={(e) => setNewSchedule({ ...newSchedule, effectiveFrom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Obowiazuje do</Label>
                      <Input
                        type="date"
                        value={newSchedule.effectiveTo}
                        onChange={(e) => setNewSchedule({ ...newSchedule, effectiveTo: e.target.value })}
                      />
                    </div>
                  </div>

                  {newSchedule.recurrenceUnit === "WEEKLY" && (
                  <Label>Dni tygodnia (powtarzające się)</Label>
                  )}
                  {newSchedule.recurrenceUnit === "WEEKLY" && (
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.slice(1).concat(daysOfWeek[0]).map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={newSchedule.daysOfWeek.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleDay(day.value)}
                      >
                        {day.short}
                      </Button>
                    ))}
                  </div>
                  )}

                  <div className="space-y-2">
                    <Label>Konkretne daty (np. zjazdy)</Label>
                    <Textarea
                      rows={3}
                      placeholder="Wpisz daty oddzielone przecinkami lub nowa linia"
                      value={newSchedule.specificDatesInput}
                      onChange={(e) => setNewSchedule({ ...newSchedule, specificDatesInput: e.target.value })}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" type="button" className="w-full">
                          <Calendar className="mr-2 h-4 w-4" />
                          Wybierz daty z kalendarza
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePickerCalendar
                          mode="multiple"
                          selected={selectedSpecificDates}
                          onSelect={(dates) =>
                            setNewSchedule({
                              ...newSchedule,
                              specificDatesInput: calendarSelectionToDatesInput(dates),
                            })
                          }
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Format: YYYY-MM-DD, np. 2026-04-12, 2026-04-26
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Od</Label>
                <Input
                  type="time"
                  value={newSchedule.startTime}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Do</Label>
                <Input
                  type="time"
                  value={newSchedule.endTime}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lokalizacja (opcjonalnie)</Label>
              <Input
                placeholder="Np. Biuro, ul. Przykładowa 1"
                value={newSchedule.location}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, location: e.target.value })
                }
              />
            </div>

            {/* Ostrzeżenie o kolizjach */}
            {conflicts.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">
                    Wykryto kolizję godzin
                  </p>
                  <ul className="mt-1 text-yellow-600 dark:text-yellow-500">
                    {conflicts.map((conflict, i) => {
                      const dayName = daysOfWeek.find((d) => d.value === conflict.day)?.label;
                      return (
                        <li key={i}>
                          {dayName}: {conflict.schedule.name} ({conflict.schedule.startTime} - {conflict.schedule.endTime})
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveSchedule} disabled={conflicts.length > 0}>
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog szczegółów harmonogramu */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Szczegóły harmonogramu</DialogTitle>
            <DialogDescription>
              {selectedScheduleDate
                ? `Wystąpienie z dnia ${format(selectedScheduleDate, "d MMMM yyyy", { locale: pl })}`
                : "Podgląd wpisu harmonogramu"}
            </DialogDescription>
          </DialogHeader>

          {selectedScheduleDetails && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{selectedScheduleDetails.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedScheduleDetails.startTime} - {selectedScheduleDetails.endTime}
                  </p>
                </div>
                <Badge variant="secondary">{getTypeInfo(selectedScheduleDetails.type).label}</Badge>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedScheduleDetails.startTime} - {selectedScheduleDetails.endTime}</span>
                </div>
                {selectedScheduleDetails.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedScheduleDetails.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{getRecurrenceLabel(selectedScheduleDetails)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback
                      style={{ backgroundColor: selectedScheduleDetails.user.color }}
                      className="text-white text-[10px]"
                    >
                      {selectedScheduleDetails.user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{selectedScheduleDetails.user.name || "Nieznany użytkownik"}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleOpenExceptionFromDetails}
              disabled={!selectedScheduleDetails}
            >
              <CalendarOff className="mr-2 h-4 w-4" />
              Dodaj dzień wolny
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFromDetails}
              disabled={!selectedScheduleDetails}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń
            </Button>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Zamknij
            </Button>
            <Button onClick={handleOpenEditFromDetails} disabled={!selectedScheduleDetails}>
              <Edit className="mr-2 h-4 w-4" />
              Edytuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog edycji harmonogramu */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edytuj harmonogram</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Nazwa</Label>
              <Input
                placeholder="Np. Praca w biurze"
                value={newSchedule.name}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={newSchedule.type}
                  onValueChange={(v) =>
                    setNewSchedule({ ...newSchedule, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Osoba</Label>
                <Select
                  value={newSchedule.userId}
                  onValueChange={(v) =>
                    setNewSchedule({ ...newSchedule, userId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!newSchedule.isOneTime && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Powtarzanie</Label>
                    <Select
                      value={newSchedule.recurrenceUnit}
                      onValueChange={(value) =>
                        setNewSchedule({
                          ...newSchedule,
                          recurrenceUnit: value as RecurrenceUnit,
                          daysOfWeek: value === "MONTHLY" ? [] : newSchedule.daysOfWeek,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Tygodniowo</SelectItem>
                        <SelectItem value="MONTHLY">Miesiecznie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Co ile</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={newSchedule.repeatEvery}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          repeatEvery: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Obowiazuje od</Label>
                    <Input
                      type="date"
                      value={newSchedule.effectiveFrom}
                      onChange={(e) => setNewSchedule({ ...newSchedule, effectiveFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Obowiazuje do</Label>
                    <Input
                      type="date"
                      value={newSchedule.effectiveTo}
                      onChange={(e) => setNewSchedule({ ...newSchedule, effectiveTo: e.target.value })}
                    />
                  </div>
                </div>

                {newSchedule.recurrenceUnit === "WEEKLY" && (
                  <div className="space-y-2">
                    <Label>Dni tygodnia</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {daysOfWeek.slice(1).concat(daysOfWeek.slice(0, 1)).map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={
                            newSchedule.daysOfWeek.includes(day.value)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            const newDays = newSchedule.daysOfWeek.includes(day.value)
                              ? newSchedule.daysOfWeek.filter((d) => d !== day.value)
                              : [...newSchedule.daysOfWeek, day.value];
                            setNewSchedule({ ...newSchedule, daysOfWeek: newDays });
                          }}
                        >
                          {day.short}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Konkretne daty (np. zjazdy)</Label>
                  <Textarea
                    rows={3}
                    placeholder="Wpisz daty oddzielone przecinkami lub nowa linia"
                    value={newSchedule.specificDatesInput}
                    onChange={(e) => setNewSchedule({ ...newSchedule, specificDatesInput: e.target.value })}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" type="button" className="w-full">
                        <Calendar className="mr-2 h-4 w-4" />
                        Wybierz daty z kalendarza
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DatePickerCalendar
                        mode="multiple"
                        selected={selectedSpecificDates}
                        onSelect={(dates) =>
                          setNewSchedule({
                            ...newSchedule,
                            specificDatesInput: calendarSelectionToDatesInput(dates),
                          })
                        }
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Format: YYYY-MM-DD, np. 2026-04-12, 2026-04-26
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Godzina rozpoczęcia</Label>
                <Input
                  type="time"
                  value={newSchedule.startTime}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, startTime: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Godzina zakończenia</Label>
                <Input
                  type="time"
                  value={newSchedule.endTime}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lokalizacja (opcjonalnie)</Label>
              <Input
                placeholder="Np. Biuro, ul. Przykładowa 1"
                value={newSchedule.location}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, location: e.target.value })
                }
              />
            </div>

            {/* Ostrzeżenie o kolizjach */}
            {conflicts.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">
                    Wykryto kolizję godzin
                  </p>
                  <ul className="mt-1 text-yellow-600 dark:text-yellow-500">
                    {conflicts.map((conflict, i) => {
                      const dayName = daysOfWeek.find((d) => d.value === conflict.day)?.label;
                      return (
                        <li key={i}>
                          {dayName}: {conflict.schedule.name} ({conflict.schedule.startTime} - {conflict.schedule.endTime})
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleEditSchedule}>
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog dodawania wyjątku (dnia wolnego) */}
      <Dialog open={isExceptionDialogOpen} onOpenChange={setIsExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              Dodaj dzień wolny
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedScheduleForException && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedScheduleForException.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedScheduleForException.startTime} - {selectedScheduleForException.endTime}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Data dnia wolnego</Label>
              <Input
                type="date"
                value={exceptionDate}
                onChange={(e) => setExceptionDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Powód (opcjonalnie)</Label>
              <Input
                placeholder="Np. Urlop, Święto, Choroba..."
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
              />
            </div>

            {/* Lista istniejących wyjątków */}
            {selectedScheduleForException && selectedScheduleForException.exceptions?.length > 0 && (
              <div className="space-y-2">
                <Label>Istniejące dni wolne:</Label>
                <div className="space-y-1">
                  {selectedScheduleForException.exceptions.map((exc) => (
                    <div
                      key={exc.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {format(new Date(exc.date), "d MMMM yyyy", { locale: pl })}
                        </span>
                        {exc.reason && (
                          <span className="text-muted-foreground ml-2">
                            ({exc.reason})
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500"
                        onClick={() => handleDeleteException(selectedScheduleForException.id, exc.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExceptionDialogOpen(false)}>
              Zamknij
            </Button>
            <Button onClick={handleAddException} disabled={!exceptionDate}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Dodaj dzień wolny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog nadpisywania konkretnego dnia */}
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Zmień harmonogram na konkretny dzień
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedScheduleForOverride && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedScheduleForOverride.name}</p>
                <p className="text-sm text-muted-foreground">
                  Standardowo: {selectedScheduleForOverride.startTime} - {selectedScheduleForOverride.endTime}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Na ten dzień zostanie utworzony nowy harmonogram z innymi godzinami,
                a standardowy harmonogram zostanie ukryty.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nowa godzina rozpoczęcia</Label>
                <Input
                  type="time"
                  value={overrideStartTime}
                  onChange={(e) => setOverrideStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nowa godzina zakończenia</Label>
                <Input
                  type="time"
                  value={overrideEndTime}
                  onChange={(e) => setOverrideEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lokalizacja (opcjonalnie)</Label>
              <Input
                placeholder="Np. Inna sala, Praca zdalna..."
                value={overrideLocation}
                onChange={(e) => setOverrideLocation(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOverrideDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveOverride}>
              <Edit className="mr-2 h-4 w-4" />
              Zapisz zmianę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog szablonów */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wybierz szablon harmonogramu</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Osoba, dla której dodać harmonogram:</Label>
              <Select
                value={newSchedule.userId}
                onValueChange={(v) =>
                  setNewSchedule({ ...newSchedule, userId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {scheduleTemplates.map((template) => {
                const TypeIcon = getTypeInfo(template.type).icon;
                return (
                  <Card
                    key={template.name}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          getTypeInfo(template.type).color
                        )}>
                          <TypeIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1.5">
                        {template.schedules.map((sched, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded"
                          >
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{sched.name}</span>
                            <span className="text-muted-foreground ml-auto">
                              {sched.startTime}-{sched.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyTemplate(template);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Zastosuj szablon
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog zarządzania wszystkimi wyjątkami */}
      <Dialog open={isExceptionsManagerOpen} onOpenChange={setIsExceptionsManagerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              Zarządzaj dniami wolnymi
            </DialogTitle>
            <DialogDescription>
              Przeglądaj i zarządzaj wszystkimi dniami wolnymi w harmonogramach
            </DialogDescription>
          </DialogHeader>

          {/* Przycisk dodaj urlop dla wszystkich harmonogramów */}
          {filteredSchedules.length > 0 && (
            <div className="px-6 pb-4 border-b">
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  if (filteredSchedules.length > 0) {
                    setSelectedScheduleForException(filteredSchedules[0]);
                    setExceptionStartDate("");
                    setExceptionEndDate("");
                    setExceptionReason("");
                    setIsRangeExceptionDialogOpen(true);
                  }
                }}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Dodaj urlop (zakres dat)
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Filtruj harmonogramy z wyjątkami */}
            {filteredSchedules
              .filter((s) => s.exceptions && s.exceptions.length > 0)
              .map((schedule) => {
                const typeInfo = getTypeInfo(schedule.type);
                const TypeIcon = typeInfo.icon;

                return (
                  <div key={schedule.id} className="space-y-3">
                    {/* Nagłówek harmonogramu */}
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <div className={cn("p-2 rounded-lg text-white", typeInfo.color)}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{schedule.name}</h3>
                          <Avatar className="h-5 w-5">
                            <AvatarFallback
                              style={{ backgroundColor: schedule.user.color }}
                              className="text-white text-xs"
                            >
                              {schedule.user.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {schedule.startTime} - {schedule.endTime}
                          {schedule.location && ` • ${schedule.location}`}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {schedule.exceptions.length} {schedule.exceptions.length === 1 ? "wyjątek" : "wyjątków"}
                      </Badge>
                    </div>

                    {/* Lista wyjątków */}
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {schedule.exceptions
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((exception) => {
                          const exceptionDate = new Date(exception.date);
                          const isPast = exceptionDate < new Date();

                          return (
                            <Card key={exception.id} className={cn(isPast && "opacity-60")}>
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <CalendarOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <span className="font-medium text-sm">
                                        {format(exceptionDate, "d MMM yyyy", { locale: pl })}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {format(exceptionDate, "EEEE", { locale: pl })}
                                    </div>
                                    {exception.reason && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {exception.reason}
                                      </p>
                                    )}
                                    {isPast && (
                                      <Badge variant="outline" className="mt-2 text-xs">
                                        Przeszły
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                    onClick={() => handleDeleteException(schedule.id, exception.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>

                    {/* Przycisk dodawania nowego wyjątku */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedScheduleForException(schedule);
                        setExceptionDate("");
                        setExceptionReason("");
                        setIsExceptionsManagerOpen(false);
                        setIsExceptionDialogOpen(true);
                      }}
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Dodaj dzień wolny dla tego harmonogramu
                    </Button>
                  </div>
                );
              })}

            {/* Pusta lista */}
            {filteredSchedules.filter((s) => s.exceptions && s.exceptions.length > 0).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarOff className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Brak dni wolnych</h3>
                <p className="text-muted-foreground max-w-md">
                  Nie masz jeszcze żadnych zaplanowanych dni wolnych w harmonogramach.
                  Możesz dodać je klikając na konkretny harmonogram w kalendarzu.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsExceptionsManagerOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog dodawania zakresu dat urlopu */}
      <Dialog open={isRangeExceptionDialogOpen} onOpenChange={setIsRangeExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5" />
              Dodaj urlop (zakres dat)
            </DialogTitle>
            <DialogDescription>
              Dodaj dni wolne dla wybranego zakresu dat
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Wybór harmonogramu */}
            <div className="space-y-2">
              <Label>Harmonogram</Label>
              <Select
                value={selectedScheduleForException?.id || ""}
                onValueChange={(value) => {
                  const schedule = filteredSchedules.find(s => s.id === value);
                  if (schedule) setSelectedScheduleForException(schedule);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz harmonogram" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSchedules.map((schedule) => {
                    return (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        <div className="flex items-center gap-2">
                          <span>{schedule.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({schedule.user.name})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Zakres dat */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data początkowa</Label>
                <Input
                  type="date"
                  value={exceptionStartDate}
                  onChange={(e) => setExceptionStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data końcowa</Label>
                <Input
                  type="date"
                  value={exceptionEndDate}
                  onChange={(e) => setExceptionEndDate(e.target.value)}
                  min={exceptionStartDate}
                />
              </div>
            </div>

            {/* Podgląd liczby dni */}
            {exceptionStartDate && exceptionEndDate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Liczba dni wolnych:{" "}
                  {(() => {
                    const start = new Date(exceptionStartDate);
                    const end = new Date(exceptionEndDate);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return days > 0 ? days : 0;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(exceptionStartDate), "d MMM yyyy", { locale: pl })} -{" "}
                  {format(new Date(exceptionEndDate), "d MMM yyyy", { locale: pl })}
                </p>
              </div>
            )}

            {/* Powód */}
            <div className="space-y-2">
              <Label>Powód (opcjonalnie)</Label>
              <Input
                placeholder="Np. Urlop, Święta, Wyjazd..."
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRangeExceptionDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddRangeException}>
              Dodaj dni wolne
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

