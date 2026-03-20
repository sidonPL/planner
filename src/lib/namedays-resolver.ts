import { POLAND_NAMEDAYS_CSV } from "@/lib/namedays-csv-data";

export type NameDayDate = `${string}-${string}`;

const NAME_DAY_PATTERN = /^\d{2}-\d{2}$/;

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function extractFirstName(fullName: string): string {
  const cleaned = fullName
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.]/g, "");

  return cleaned.split(/[\s-]+/).find(Boolean) || "";
}

function parseCsv() {
  const byDate = new Map<NameDayDate, string[]>();
  const byNormalizedName = new Map<string, NameDayDate[]>();

  const lines = POLAND_NAMEDAYS_CSV.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const [datePart, namesPart = ""] = line.split(";");
    if (!NAME_DAY_PATTERN.test(datePart)) continue;

    const [monthRaw, dayRaw] = datePart.split("-").map(Number);
    if (!monthRaw || !dayRaw) continue;

    const normalizedDate = `${pad2(dayRaw)}-${pad2(monthRaw)}` as NameDayDate;
    const names = namesPart
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    byDate.set(normalizedDate, names);

    for (const name of names) {
      const key = normalize(name);
      const current = byNormalizedName.get(key) || [];
      if (!current.includes(normalizedDate)) {
        current.push(normalizedDate);
      }
      byNormalizedName.set(key, current);
    }
  }

  return { byDate, byNormalizedName };
}

const parsedNameDays = parseCsv();

function buildDate(nameDay: NameDayDate, year: number): Date | null {
  const [dayRaw, monthRaw] = nameDay.split("-").map(Number);
  const date = new Date(year, monthRaw - 1, dayRaw);

  // Walidacja np. 31-02
  if (date.getMonth() !== monthRaw - 1 || date.getDate() !== dayRaw) {
    return null;
  }

  return date;
}

function nextOccurrence(nameDay: NameDayDate, from: Date): Date | null {
  const thisYear = buildDate(nameDay, from.getFullYear());
  if (!thisYear) return null;

  const startOfToday = new Date(from);
  startOfToday.setHours(0, 0, 0, 0);

  if (thisYear >= startOfToday) {
    return thisYear;
  }

  return buildDate(nameDay, from.getFullYear() + 1);
}

function resolveCandidatesForName(fullName: string, from: Date): NameDayDate[] {
  const firstName = extractFirstName(fullName);
  if (!firstName) return [];

  const normalizedFirstName = normalize(firstName);
  const directMatches = parsedNameDays.byNormalizedName.get(normalizedFirstName) || [];

  // Fallback dla wariantow fleksyjnych/skrotow
  const fuzzyMatches = directMatches.length
    ? []
    : Array.from(parsedNameDays.byNormalizedName.entries())
        .filter(([key]) => key.startsWith(normalizedFirstName) || normalizedFirstName.startsWith(key))
        .flatMap(([, dates]) => dates);

  const candidates = [...new Set([...directMatches, ...fuzzyMatches])];

  return candidates
    .map((candidate) => ({ candidate, date: nextOccurrence(candidate, from) }))
    .filter((entry): entry is { candidate: NameDayDate; date: Date } => !!entry.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => entry.candidate);
}

export function isValidNameDayFormat(nameDay: string | null | undefined): nameDay is NameDayDate {
  if (!nameDay || !NAME_DAY_PATTERN.test(nameDay)) return false;

  const [dayRaw, monthRaw] = nameDay.split("-").map(Number);
  const probe = new Date(2024, monthRaw - 1, dayRaw);

  return probe.getMonth() === monthRaw - 1 && probe.getDate() === dayRaw;
}

export function normalizeNameDayInput(input: string | null | undefined): NameDayDate | null {
  if (!input) return null;

  const trimmed = input.trim();
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const normalized = `${pad2(day)}-${pad2(month)}` as NameDayDate;

  return isValidNameDayFormat(normalized) ? normalized : null;
}

export function formatNameDay(day: number, month: number): NameDayDate {
  return `${pad2(day)}-${pad2(month)}` as NameDayDate;
}

export function getNameDayNames(nameDay: NameDayDate): string[] {
  return parsedNameDays.byDate.get(nameDay) || [];
}

export function getNameDayDateByName(fullName: string, from: Date = new Date()): NameDayDate | null {
  const [first] = resolveCandidatesForName(fullName, from);
  return first || null;
}

export function getNameDayDateOptionsByName(fullName: string, from: Date = new Date()): NameDayDate[] {
  return resolveCandidatesForName(fullName, from);
}

export function nameDayToDate(nameDay: NameDayDate, from: Date = new Date()): Date | null {
  return nextOccurrence(nameDay, from);
}




