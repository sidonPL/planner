import {
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
} from "date-fns";
import {
  APP_TIMEZONE,
  getLocalDateKey,
  getLocalDayDate,
  isSameLocalDay,
} from "./local-date";

export type RoutineTaskLike = {
  id: string;
  parentTaskId?: string | null;
  isRecurring: boolean;
  dueDate: Date | string | null;
  dueTime?: string | null;
  recurrenceType?: string | null;
  recurrenceInterval?: number | null;
  recurrenceDays?: number[];
  recurrenceEndDate?: Date | string | null;
};

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getLocalDayOfWeek(
  date: Date,
  timeZone = APP_TIMEZONE
): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? date.getDay();
}

export function getLocalDayOfMonth(
  date: Date,
  timeZone = APP_TIMEZONE
): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      day: "numeric",
    }).format(date)
  );
}

/**
 * Checks whether a routine template should occur on a given calendar day.
 */
export function isRoutineScheduledForDay(
  task: RoutineTaskLike,
  date: Date = new Date(),
  timeZone = APP_TIMEZONE
): boolean {
  if (!task.isRecurring) return false;

  const dayDate = getLocalDayDate(date, timeZone);
  const anchor = asDate(task.dueDate)
    ? getLocalDayDate(asDate(task.dueDate)!, timeZone)
    : dayDate;

  const endDate = asDate(task.recurrenceEndDate);
  if (endDate && dayDate > getLocalDayDate(endDate, timeZone)) {
    return false;
  }

  if (dayDate < anchor) {
    return false;
  }

  const recurrenceType = task.recurrenceType || "DAILY";
  const interval = Math.max(1, task.recurrenceInterval || 1);

  switch (recurrenceType) {
    case "DAILY":
    case "CUSTOM": {
      const anchorKey = getLocalDateKey(anchor, timeZone);
      const dayKey = getLocalDateKey(dayDate, timeZone);
      const diffDays = Math.round(
        (localDateKeyToMs(dayKey) - localDateKeyToMs(anchorKey)) /
          (24 * 60 * 60 * 1000)
      );
      return diffDays >= 0 && diffDays % interval === 0;
    }

    case "WEEKLY": {
      const allowedDays = task.recurrenceDays?.length
        ? task.recurrenceDays
        : [getLocalDayOfWeek(anchor, timeZone)];

      if (!allowedDays.includes(getLocalDayOfWeek(dayDate, timeZone))) {
        return false;
      }

      const diffWeeks = differenceInCalendarWeeks(dayDate, anchor, {
        weekStartsOn: 1,
      });
      return diffWeeks >= 0 && diffWeeks % interval === 0;
    }

    case "MONTHLY": {
      const allowedDays = task.recurrenceDays?.length
        ? task.recurrenceDays
        : [getLocalDayOfMonth(anchor, timeZone)];

      if (!allowedDays.includes(getLocalDayOfMonth(dayDate, timeZone))) {
        return false;
      }

      const diffMonths = differenceInCalendarMonths(dayDate, anchor);
      return diffMonths >= 0 && diffMonths % interval === 0;
    }

    case "YEARLY": {
      const anchorKey = getLocalDateKey(anchor, timeZone);
      const dayKey = getLocalDateKey(dayDate, timeZone);
      if (anchorKey.slice(5) !== dayKey.slice(5)) {
        return false;
      }

      const diffYears =
        Number(dayKey.slice(0, 4)) - Number(anchorKey.slice(0, 4));
      return diffYears >= 0 && diffYears % interval === 0;
    }

    default:
      return isSameLocalDay(dayDate, anchor, timeZone);
  }
}

function localDateKeyToMs(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00.000Z`).getTime();
}

/**
 * Returns routines visible for a specific day.
 * Prefers generated instances; falls back to recurrence rules on the template.
 */
export function getRoutinesForDay<T extends RoutineTaskLike>(
  routines: T[],
  date: Date = new Date()
): T[] {
  const dayDate = getLocalDayDate(date);
  const groups = new Map<string, T[]>();

  for (const routine of routines) {
    if (!routine.isRecurring) continue;
    const key = routine.parentTaskId || routine.id;
    const list = groups.get(key) ?? [];
    list.push(routine);
    groups.set(key, list);
  }

  const result: T[] = [];

  for (const group of groups.values()) {
    const instancesForDay = group.filter(
      (routine) =>
        routine.dueDate && isSameLocalDay(new Date(routine.dueDate), dayDate)
    );

    if (instancesForDay.length > 0) {
      result.push(...instancesForDay);
      continue;
    }

    const template =
      group.find((routine) => !routine.parentTaskId) ??
      group.reduce<T | undefined>((earliest, routine) => {
        if (!routine.dueDate) return earliest ?? routine;
        if (!earliest?.dueDate) return routine;
        return new Date(routine.dueDate) < new Date(earliest.dueDate)
          ? routine
          : earliest;
      }, undefined);

    if (template && isRoutineScheduledForDay(template, dayDate)) {
      result.push(template);
    }
  }

  return result;
}

export function isRoutineForDay(
  task: RoutineTaskLike,
  date: Date
): boolean {
  if (!task.isRecurring) return false;

  const dayDate = getLocalDayDate(date);

  if (task.dueDate && isSameLocalDay(new Date(task.dueDate), dayDate)) {
    return true;
  }

  return isRoutineScheduledForDay(task, dayDate);
}

type RoutineWithStatus = RoutineTaskLike & { status?: string | null };

/**
 * Rutyny na dany dzień + zaległe nieukończone (tylko przy widoku „dziś”).
 */
export function getRoutinesForDayWithOverdue<T extends RoutineWithStatus>(
  routines: T[],
  date: Date = new Date()
): T[] {
  const forDay = getRoutinesForDay(routines, date);
  const today = getLocalDayDate(new Date());

  if (!isSameLocalDay(date, today)) {
    return forDay;
  }

  const displayedParents = new Set(forDay.map((task) => task.parentTaskId || task.id));
  const overdue = routines.filter((task) => {
    if (!task.isRecurring || !task.dueDate || task.status === "COMPLETED") {
      return false;
    }

    const dueDay = getLocalDayDate(new Date(task.dueDate));
    if (dueDay >= today) return false;

    const key = task.parentTaskId || task.id;
    return !displayedParents.has(key);
  });

  return [...overdue, ...forDay];
}
