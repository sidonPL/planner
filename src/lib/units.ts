/**
 * Wspólna lista jednostek używanych w aplikacji (zakupy, zapasy, przepisy)
 */
export const UNITS = [
  { value: "szt", label: "sztuk" },
  { value: "kg", label: "kilogram" },
  { value: "g", label: "gram" },
  { value: "l", label: "litr" },
  { value: "ml", label: "mililitr" },
  { value: "opak", label: "opakowanie" },
  { value: "puszka", label: "puszka" },
  { value: "słoik", label: "słoik" },
  { value: "butelka", label: "butelka" },
  { value: "pęczek", label: "pęczek" },
  { value: "główka", label: "główka" },
  { value: "łyżka", label: "łyżka" },
  { value: "łyżeczka", label: "łyżeczka" },
  { value: "szczypta", label: "szczypta" },
  { value: "plaster", label: "plaster" },
  { value: "kromka", label: "kromka" },
  { value: "kostka", label: "kostka" },
  { value: "szkl", label: "szklanka" },
  { value: "garść", label: "garść" },
  { value: "ząbek", label: "ząbek" },
] as const;

/**
 * Typ dla wartości jednostki
 */
export type UnitValue = typeof UNITS[number]["value"];

/**
 * Skrócone etykiety dla przepisów (gdzie mało miejsca)
 */
export const UNITS_SHORT = [
  { value: "szt", label: "szt" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "l", label: "l" },
  { value: "ml", label: "ml" },
  { value: "opak", label: "opak" },
  { value: "puszka", label: "puszka" },
  { value: "słoik", label: "słoik" },
  { value: "butelka", label: "but." },
  { value: "pęczek", label: "pęczek" },
  { value: "główka", label: "główka" },
  { value: "łyżka", label: "łyżka" },
  { value: "łyżeczka", label: "łyżeczka" },
  { value: "szczypta", label: "szczypta" },
  { value: "plaster", label: "plaster" },
  { value: "kromka", label: "kromka" },
  { value: "kostka", label: "kostka" },
  { value: "szkl", label: "szkl" },
  { value: "garść", label: "garść" },
  { value: "ząbek", label: "ząbek" },
] as const;

