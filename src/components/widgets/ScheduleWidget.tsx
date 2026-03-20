"use client";

import { format, isSameDay } from "date-fns";
import { pl } from "date-fns/locale";
import { Briefcase, GraduationCap, BookOpen, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { doesScheduleOccurOnDate } from "@/lib/schedule-occurrence";

interface Schedule {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  dayOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string | null;
  color: string | null;
  isOneTime: boolean;
  oneTimeDate: Date | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  recurrenceUnit?: "WEEKLY" | "MONTHLY";
  repeatEvery?: number;
  specificDates?: Date[];
  exceptions: {
    id: string;
    date: Date;
    reason: string | null;
  }[];
  user: {
    id: string;
    name: string | null;
    color: string;
  };
}

interface ScheduleWidgetProps {
  schedules: Schedule[];
  viewMode: "family" | "personal";
  activeUserId?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  WORK: <Briefcase className="h-4 w-4" />,
  SCHOOL: <GraduationCap className="h-4 w-4" />,
  UNIVERSITY: <BookOpen className="h-4 w-4" />,
  COURSE: <BookOpen className="h-4 w-4" />,
  OTHER: <Clock className="h-4 w-4" />,
};

export function ScheduleWidget({
  schedules,
  viewMode,
  activeUserId,
}: ScheduleWidgetProps) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = niedziela

  const parseTimeToMinutes = (time: string) => {
    const [hoursRaw, minutesRaw] = time.split(":");
    const hours = Number(hoursRaw) || 0;
    const minutes = Number(minutesRaw) || 0;
    return hours * 60 + minutes;
  };

  const isScheduleForToday = (schedule: Schedule) => {
    const hasExceptionToday = schedule.exceptions?.some((exception) =>
      isSameDay(new Date(exception.date), today)
    );

    if (hasExceptionToday) {
      return false;
    }

    if (schedule.isOneTime) {
      if (!schedule.oneTimeDate) return false;
      return isSameDay(new Date(schedule.oneTimeDate), today);
    }

    return schedule.dayOfWeek.includes(dayOfWeek);
  };

  // Filtruj harmonogramy na dzisiaj
  const todaySchedules = schedules.filter((schedule) => {
    if (isScheduleForToday(schedule)) {
      return true;
    }
    return doesScheduleOccurOnDate(schedule, today);
  });

  // Filtruj per użytkownik jeśli widok osobisty
  const filteredSchedules =
    viewMode === "personal" && activeUserId
      ? todaySchedules.filter((s) => s.user.id === activeUserId)
      : todaySchedules;

  // Sortuj po godzinie rozpoczęcia
  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });

  // Znajdź aktualny/następny wpis
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const currentSchedule = sortedSchedules.find((s) => {
    const start = parseTimeToMinutes(s.startTime);
    const end = parseTimeToMinutes(s.endTime);
    return currentMinutes >= start && currentMinutes < end;
  });

  const nextSchedule = sortedSchedules.find((s) => {
    const start = parseTimeToMinutes(s.startTime);
    return start > currentMinutes;
  });

  if (sortedSchedules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Harmonogram na dziś
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Brak zaplanowanych zajęć</p>
            <p className="text-xs mt-1">
              {format(today, "EEEE, d MMMM", { locale: pl })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Harmonogram na dziś
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedSchedules.map((schedule) => {
          const isCurrent = currentSchedule?.id === schedule.id;
          const isNext = nextSchedule?.id === schedule.id && !currentSchedule;

          return (
            <div
              key={schedule.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                isCurrent && "border-primary bg-primary/5",
                isNext && !isCurrent && "border-dashed border-primary/50",
                !isCurrent && !isNext && "border-border"
              )}
            >
              <div
                className="p-2 rounded-full"
                style={{
                  backgroundColor: schedule.color || schedule.user.color,
                  color: "white",
                }}
              >
                {typeIcons[schedule.type] || typeIcons.OTHER}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{schedule.name}</p>
                  {isCurrent && (
                    <Badge variant="default" className="text-xs">
                      Teraz
                    </Badge>
                  )}
                  {isNext && !isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      Następne
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>
                    {schedule.startTime} - {schedule.endTime}
                  </span>
                  {schedule.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {schedule.location}
                      </span>
                    </>
                  )}
                </div>
                {viewMode === "family" && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: schedule.user.color }}
                  >
                    {schedule.user.name}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

