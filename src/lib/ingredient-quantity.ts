const UNICODE_FRACTIONS: Record<string, string> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
};

export const INGREDIENT_QUANTITY_HINT = "Akceptuje: 0.5, 1/2, 1 1/2";

const normalizeQuantityString = (value: string): string => {
  let normalized = value.trim();
  Object.entries(UNICODE_FRACTIONS).forEach(([unicode, ascii]) => {
    normalized = normalized.replaceAll(unicode, ascii);
  });
  return normalized.replace(/,/g, ".");
};

export function parseIngredientQuantity(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const normalized = normalizeQuantityString(value);
  if (!normalized) return null;

  const mixedMatch = normalized.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const numerator = Number(mixedMatch[2]);
    const denominator = Number(mixedMatch[3]);
    if (denominator === 0) return null;
    return whole + numerator / denominator;
  }

  const fractionMatch = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  const decimal = Number(normalized);
  return Number.isFinite(decimal) ? decimal : null;
}

export function hasQuantityInput(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}


