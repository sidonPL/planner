/**
 * Etykiety dla kategorii przepisów
 */
export const categoryLabels: Record<string, string> = {
  breakfast: "Śniadanie",
  lunch: "Obiad",
  dinner: "Kolacja",
  dessert: "Deser",
  snack: "Przekąska",
  drink: "Napój",
  other: "Inne",
};

/**
 * Etykiety dla poziomów trudności przepisów
 */
export const difficultyLabels: Record<string, { label: string; color: string }> = {
  EASY: { label: "Łatwy", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  MEDIUM: { label: "Średni", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  HARD: { label: "Trudny", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

/**
 * Etykiety dla metod gotowania
 */
export const cookingMethodLabels: Record<string, { label: string; emoji: string }> = {
  BAKING: { label: "Pieczenie", emoji: "🔥" },
  BOILING: { label: "Gotowanie", emoji: "💧" },
  FRYING: { label: "Smażenie", emoji: "🍳" },
  GRILLING: { label: "Grillowanie", emoji: "🔥" },
  STEAMING: { label: "Gotowanie na parze", emoji: "♨️" },
  ROASTING: { label: "Pieczenie (mięso)", emoji: "🍖" },
  SLOW_COOKING: { label: "Wolne gotowanie", emoji: "🍲" },
  PRESSURE_COOKING: { label: "Szybkowar", emoji: "⚡" },
  SAUTEING: { label: "Podsmażanie", emoji: "🥗" },
  AIR_FRYING: { label: "Air fryer", emoji: "🌀" },
  MIXING: { label: "Mieszanie", emoji: "🥣" },
  OTHER: { label: "Inne", emoji: "📋" },
};

/**
 * Funkcja do formatowania czasu
 */
export function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes}min`;
}

/**
 * Funkcja do sanityzacji nazwy pliku
 */
export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

