/**
 * Helper do obsługi rocznic (śluby, zaręczyny, ważne wydarzenia)
 */

import type { Anniversary, AnniversaryType } from "@prisma/client";

export interface AnniversaryWithYears extends Anniversary {
  yearsAgo: number; // Ile lat minęło od wydarzenia
}

/**
 * Etykiety typów rocznic
 */
export const anniversaryTypeLabels: Record<AnniversaryType, string> = {
  WEDDING: "Ślub",
  ENGAGEMENT: "Zaręczyny",
  FIRST_DATE: "Pierwsza randka",
  MOVING: "Przeprowadzka",
  JOB_START: "Początek pracy",
  GRADUATION: "Ukończenie szkoły",
  OTHER: "Inne",
};

/**
 * Ikony dla typów rocznic
 */
export const anniversaryTypeIcons: Record<AnniversaryType, string> = {
  WEDDING: "💍",
  ENGAGEMENT: "💑",
  FIRST_DATE: "❤️",
  MOVING: "🏠",
  JOB_START: "💼",
  GRADUATION: "🎓",
  OTHER: "📅",
};

/**
 * Kolory dla typów rocznic
 */
export const anniversaryTypeColors: Record<AnniversaryType, string> = {
  WEDDING: "#EC4899",
  ENGAGEMENT: "#F472B6",
  FIRST_DATE: "#FB7185",
  MOVING: "#3B82F6",
  JOB_START: "#8B5CF6",
  GRADUATION: "#10B981",
  OTHER: "#6B7280",
};

/**
 * Generuje wydarzenia rocznicowe dla danego roku
 */
export function generateAnniversaryEvents(
  anniversaries: Anniversary[],
  year: number
): AnniversaryWithYears[] {
  return anniversaries.map((anniversary) => {
    const originalDate = new Date(anniversary.date);
    const anniversaryThisYear = new Date(
      year,
      originalDate.getMonth(),
      originalDate.getDate()
    );

    const yearsAgo = year - originalDate.getFullYear();

    return {
      ...anniversary,
      date: anniversaryThisYear,
      yearsAgo,
    };
  });
}

/**
 * Generuje wydarzenia rocznicowe dla zakresu dat
 */
export function generateAnniversaryEventsForRange(
  anniversaries: Anniversary[],
  startDate: Date,
  endDate: Date
): AnniversaryWithYears[] {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const allAnniversaries: AnniversaryWithYears[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearAnniversaries = generateAnniversaryEvents(anniversaries, year);

    // Filtruj tylko te w zakresie dat
    const filtered = yearAnniversaries.filter(
      (a) => a.date >= startDate && a.date <= endDate
    );

    allAnniversaries.push(...filtered);
  }

  return allAnniversaries;
}

/**
 * Pobiera nadchodzące rocznice
 */
export function getUpcomingAnniversaries(
  anniversaries: Anniversary[],
  daysAhead: number = 30
): AnniversaryWithYears[] {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  return generateAnniversaryEventsForRange(anniversaries, today, endDate).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}

/**
 * Pobiera rocznice na dziś
 */
export function getTodaysAnniversaries(
  anniversaries: Anniversary[]
): AnniversaryWithYears[] {
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  const currentYear = today.getFullYear();

  return anniversaries
    .filter((anniversary) => {
      const date = new Date(anniversary.date);
      return (
        date.getMonth() === todayMonth &&
        date.getDate() === todayDay
      );
    })
    .map((anniversary) => {
      const originalDate = new Date(anniversary.date);
      const yearsAgo = currentYear - originalDate.getFullYear();

      return {
        ...anniversary,
        date: new Date(currentYear, todayMonth, todayDay),
        yearsAgo,
      };
    });
}

/**
 * Formatuje wiadomość o rocznicy
 */
export function formatAnniversaryMessage(anniversary: AnniversaryWithYears): string {
  const icon = anniversaryTypeIcons[anniversary.type];
  const label = anniversaryTypeLabels[anniversary.type];

  if (anniversary.yearsAgo === 0) {
    return `${icon} ${anniversary.title}`;
  } else if (anniversary.yearsAgo === 1) {
    return `${icon} ${anniversary.title} (1 rok)`;
  } else if (anniversary.yearsAgo < 5) {
    return `${icon} ${anniversary.title} (${anniversary.yearsAgo} lata)`;
  } else {
    return `${icon} ${anniversary.title} (${anniversary.yearsAgo} lat)`;
  }
}

/**
 * Pobiera specjalną wiadomość dla okrągłych rocznic
 */
export function getSpecialAnniversaryMessage(yearsAgo: number): string | null {
  const specialYears: Record<number, string> = {
    1: "Pierwsza rocznica! 🎉",
    5: "5 lat! 🎊",
    10: "10 lat! 🏆",
    15: "15 lat! 💎",
    20: "20 lat! 🌟",
    25: "Srebrne gody! 🥈",
    30: "30 lat! 🎖️",
    40: "40 lat! 👑",
    50: "Złote gody! 🥇",
    60: "Diamentowe gody! 💎",
  };

  return specialYears[yearsAgo] || null;
}

