import { differenceInCalendarWeeks, differenceInCalendarMonths, isSameDay, startOfDay } from "date-fns";

type ExceptionLike = {
  date: Date | string;
};

export type ScheduleOccurrenceLike = {
  isActive: boolean;
  isOneTime: boolean;
  oneTimeDate: Date | string | null;
  dayOfWeek: number[];
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  recurrenceUnit?: "WEEKLY" | "MONTHLY" | null;
  repeatEvery?: number | null;
  specificDates?: Array<Date | string>;
  exceptions?: ExceptionLike[];
};

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasExceptionOnDate(schedule: ScheduleOccurrenceLike, date: Date): boolean {
  return (schedule.exceptions || []).some((exception) => {
    const exceptionDate = asDate(exception.date);
    return exceptionDate ? isSameDay(exceptionDate, date) : false;
  });
}

function isWithinDateBounds(schedule: ScheduleOccurrenceLike, date: Date): boolean {
  const dayDate = startOfDay(date);
  const effectiveFrom = asDate(schedule.effectiveFrom);
  const effectiveTo = asDate(schedule.effectiveTo);

  if (effectiveFrom && dayDate < startOfDay(effectiveFrom)) {
    return false;
  }

  if (effectiveTo && dayDate > startOfDay(effectiveTo)) {
    return false;
  }

  return true;
}

function occursAsSpecificDate(schedule: ScheduleOccurrenceLike, date: Date): boolean {
  const specificDates = (schedule.specificDates || [])
    .map((entry) => asDate(entry))
    .filter((entry): entry is Date => !!entry);

  if (specificDates.length === 0) return false;
  return specificDates.some((specificDate) => isSameDay(specificDate, date));
}

function occursAsWeekly(schedule: ScheduleOccurrenceLike, date: Date): boolean {
  if (!schedule.dayOfWeek.includes(date.getDay())) return false;

  const repeatEvery = Math.max(1, schedule.repeatEvery || 1);
  if (repeatEvery === 1) return true;

  const anchorDate = asDate(schedule.effectiveFrom) || date;
  const diff = differenceInCalendarWeeks(startOfDay(date), startOfDay(anchorDate), {
    weekStartsOn: 1,
  });

  if (diff < 0) return false;
  return diff % repeatEvery === 0;
}

function occursAsMonthly(schedule: ScheduleOccurrenceLike, date: Date): boolean {
  const anchorDate = asDate(schedule.effectiveFrom) || date;
  const dayOfMonth = anchorDate.getDate();

  if (date.getDate() !== dayOfMonth) return false;

  const repeatEvery = Math.max(1, schedule.repeatEvery || 1);
  if (repeatEvery === 1) return true;

  const diff = differenceInCalendarMonths(startOfDay(date), startOfDay(anchorDate));

  if (diff < 0) return false;
  return diff % repeatEvery === 0;
}

export function doesScheduleOccurOnDate(schedule: ScheduleOccurrenceLike, date: Date): boolean {
  if (!schedule.isActive) return false;

  if (hasExceptionOnDate(schedule, date)) {
    return false;
  }

  if (schedule.isOneTime) {
    const oneTimeDate = asDate(schedule.oneTimeDate);
    return oneTimeDate ? isSameDay(oneTimeDate, date) : false;
  }

  if (!isWithinDateBounds(schedule, date)) {
    return false;
  }

  if (occursAsSpecificDate(schedule, date)) {
    return true;
  }

  if ((schedule.specificDates || []).length > 0) {
    return false;
  }

  const recurrenceUnit = schedule.recurrenceUnit || "WEEKLY";
  if (recurrenceUnit === "MONTHLY") {
    return occursAsMonthly(schedule, date);
  }

  return occursAsWeekly(schedule, date);
}

export function parseSpecificDatesInput(input: string): string[] {
  const tokens = input
    .split(/[\n,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const unique = new Set<string>();

  for (const token of tokens) {
    const date = asDate(token.length === 10 ? `${token}T00:00:00` : token);
    if (!date) continue;
    const normalized = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    unique.add(normalized);
  }

  return Array.from(unique).sort();
}

