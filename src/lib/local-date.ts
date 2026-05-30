export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Warsaw";

/** YYYY-MM-DD in the app timezone */
export function getLocalDateKey(
  date: Date = new Date(),
  timeZone = APP_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Stable UTC noon for a calendar day key (safe for DB uniqueness) */
export function localDateKeyToDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function getLocalDayDate(
  date: Date = new Date(),
  timeZone = APP_TIMEZONE
): Date {
  return localDateKeyToDate(getLocalDateKey(date, timeZone));
}

export function isSameLocalDay(
  a: Date,
  b: Date,
  timeZone = APP_TIMEZONE
): boolean {
  return getLocalDateKey(a, timeZone) === getLocalDateKey(b, timeZone);
}

export function differenceInLocalCalendarDays(
  later: Date,
  earlier: Date,
  timeZone = APP_TIMEZONE
): number {
  const laterKey = getLocalDateKey(later, timeZone);
  const earlierKey = getLocalDateKey(earlier, timeZone);

  if (laterKey === earlierKey) return 0;

  const laterMs = localDateKeyToDate(laterKey).getTime();
  const earlierMs = localDateKeyToDate(earlierKey).getTime();

  return Math.round((laterMs - earlierMs) / (24 * 60 * 60 * 1000));
}

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return asUtc - date.getTime();
}

/** Łączy dzień kalendarzowy (strefa aplikacji) z godziną HH:mm */
export function combineLocalDateAndTime(
  date: Date,
  time: string,
  timeZone = APP_TIMEZONE
): Date {
  const dateKey = getLocalDateKey(date, timeZone);
  const [hours, minutes, secondsPart] = time.split(":");
  const seconds = secondsPart ? Number(secondsPart) : 0;
  const dayAnchor = localDateKeyToDate(dateKey);
  const offsetMs = getTimeZoneOffsetMs(timeZone, dayAnchor);

  return new Date(
    dayAnchor.getTime() +
      Number(hours) * 60 * 60 * 1000 +
      Number(minutes) * 60 * 1000 +
      seconds * 1000 -
      offsetMs
  );
}

export function getLocalDayBounds(
  date: Date = new Date(),
  timeZone = APP_TIMEZONE
): { start: Date; end: Date } {
  const start = getLocalDayDate(date, timeZone);
  const end = combineLocalDateAndTime(date, "23:59:59", timeZone);
  return { start, end };
}

export function getLocalMonthBounds(
  date: Date = new Date(),
  timeZone = APP_TIMEZONE
): { start: Date; end: Date } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  const monthStartKey = `${parts.year}-${parts.month}-01`;
  const start = localDateKeyToDate(monthStartKey);

  const year = Number(parts.year);
  const month = Number(parts.month);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEndKey = `${parts.year}-${parts.month}-${String(lastDay).padStart(2, "0")}`;
  const end = combineLocalDateAndTime(localDateKeyToDate(monthEndKey), "23:59:59", timeZone);

  return { start, end };
}

export function isWithinLocalQuietHours(
  quietHoursStart: string | null | undefined,
  quietHoursEnd: string | null | undefined,
  now: Date = new Date(),
  timeZone = APP_TIMEZONE
): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false;

  const [startHour, startMinute] = quietHoursStart.split(":").map(Number);
  const [endHour, endMinute] = quietHoursEnd.split(":").map(Number);

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  );

  const nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export function differenceInLocalCalendarDaysFromKeys(
  laterKey: string,
  earlierKey: string
): number {
  if (laterKey === earlierKey) return 0;
  const laterMs = localDateKeyToDate(laterKey).getTime();
  const earlierMs = localDateKeyToDate(earlierKey).getTime();
  return Math.round((laterMs - earlierMs) / (24 * 60 * 60 * 1000));
}
