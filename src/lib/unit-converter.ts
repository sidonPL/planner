/**
 * System konwersji jednostek dla przepisów i inwentarza
 */

export type UnitCategory = 'volume' | 'weight' | 'count' | 'other';

export interface UnitConversion {
  base: string;
  multiplier: number;
  category: UnitCategory;
}

/**
 * Definicje konwersji jednostek
 * base - jednostka bazowa dla kategorii
 * multiplier - mnożnik do konwersji na jednostkę bazową
 */
export const CONVERSIONS: Record<string, UnitConversion> = {
  // Objętość (base: ml)
  'ml': { base: 'ml', multiplier: 1, category: 'volume' },
  'l': { base: 'ml', multiplier: 1000, category: 'volume' },
  'litr': { base: 'ml', multiplier: 1000, category: 'volume' },
  'litry': { base: 'ml', multiplier: 1000, category: 'volume' },
  'litrów': { base: 'ml', multiplier: 1000, category: 'volume' },
  'cl': { base: 'ml', multiplier: 10, category: 'volume' },
  'dl': { base: 'ml', multiplier: 100, category: 'volume' },

  // Kubki i łyżki (przybliżone)
  'szklanka': { base: 'ml', multiplier: 250, category: 'volume' },
  'szklanki': { base: 'ml', multiplier: 250, category: 'volume' },
  'kubek': { base: 'ml', multiplier: 250, category: 'volume' },
  'łyżka': { base: 'ml', multiplier: 15, category: 'volume' },
  'łyżki': { base: 'ml', multiplier: 15, category: 'volume' },
  'łyżek': { base: 'ml', multiplier: 15, category: 'volume' },
  'łyżeczka': { base: 'ml', multiplier: 5, category: 'volume' },
  'łyżeczki': { base: 'ml', multiplier: 5, category: 'volume' },

  // Waga (base: g)
  'g': { base: 'g', multiplier: 1, category: 'weight' },
  'gram': { base: 'g', multiplier: 1, category: 'weight' },
  'gramy': { base: 'g', multiplier: 1, category: 'weight' },
  'gramów': { base: 'g', multiplier: 1, category: 'weight' },
  'kg': { base: 'g', multiplier: 1000, category: 'weight' },
  'kilogram': { base: 'g', multiplier: 1000, category: 'weight' },
  'kilogramy': { base: 'g', multiplier: 1000, category: 'weight' },
  'dag': { base: 'g', multiplier: 10, category: 'weight' },
  'dkg': { base: 'g', multiplier: 10, category: 'weight' },
  'mg': { base: 'g', multiplier: 0.001, category: 'weight' },

  // Sztuki (base: szt)
  'szt': { base: 'szt', multiplier: 1, category: 'count' },
  'sztuk': { base: 'szt', multiplier: 1, category: 'count' },
  'sztuka': { base: 'szt', multiplier: 1, category: 'count' },
  'sztuki': { base: 'szt', multiplier: 1, category: 'count' },
  'op': { base: 'szt', multiplier: 1, category: 'count' },
  'opak': { base: 'szt', multiplier: 1, category: 'count' },
  'opakowanie': { base: 'szt', multiplier: 1, category: 'count' },
};

/**
 * Normalizuje jednostkę i ilość do jednostki bazowej
 * @param quantity - ilość
 * @param unit - jednostka (może być null/undefined)
 * @returns znormalizowana ilość i jednostka bazowa
 */
export function normalizeUnit(quantity: number, unit?: string | null): {
  quantity: number;
  unit: string;
  category: UnitCategory;
} {
  if (!unit) {
    return { quantity, unit: 'szt', category: 'count' };
  }

  const unitLower = unit.toLowerCase().trim();
  const conversion = CONVERSIONS[unitLower];

  if (!conversion) {
    return { quantity, unit: unitLower, category: 'other' };
  }

  return {
    quantity: quantity * conversion.multiplier,
    unit: conversion.base,
    category: conversion.category,
  };
}

/**
 * Sprawdza czy dwie jednostki można na siebie konwertować
 */
export function canConvert(unit1?: string | null, unit2?: string | null): boolean {
  if (!unit1 || !unit2) return true; // Jeśli brak jednostki, zakładamy że można

  const conv1 = CONVERSIONS[unit1.toLowerCase()];
  const conv2 = CONVERSIONS[unit2.toLowerCase()];

  if (!conv1 || !conv2) return false;

  return conv1.category === conv2.category;
}

/**
 * Konwertuje ilość z jednej jednostki na drugą
 * @returns przekonwertowana ilość lub null jeśli konwersja niemożliwa
 */
export function convertUnit(
  quantity: number,
  fromUnit?: string | null,
  toUnit?: string | null
): number | null {
  // Jeśli jednostki są takie same
  if (fromUnit?.toLowerCase() === toUnit?.toLowerCase()) {
    return quantity;
  }

  // Jeśli nie można konwertować
  if (!canConvert(fromUnit, toUnit)) {
    return null;
  }

  // Normalizuj do jednostki bazowej
  const normalized = normalizeUnit(quantity, fromUnit);

  // Jeśli docelowa jednostka nie istnieje, zwróć znormalizowaną
  if (!toUnit) {
    return normalized.quantity;
  }

  const targetConv = CONVERSIONS[toUnit.toLowerCase()];

  if (!targetConv) {
    return null;
  }

  // Konwertuj z jednostki bazowej na docelową
  return normalized.quantity / targetConv.multiplier;
}

/**
 * Porównuje dwie ilości z jednostkami
 * @returns true jeśli quantity1 >= quantity2 po konwersji
 */
export function compareQuantities(
  quantity1: number,
  unit1: string | null | undefined,
  quantity2: number,
  unit2: string | null | undefined
): boolean {
  const converted = convertUnit(quantity1, unit1, unit2);

  if (converted === null) {
    // Nie można porównać różnych kategorii
    return false;
  }

  return converted >= quantity2;
}

/**
 * Formatuje ilość z jednostką do wyświetlenia
 */
export function formatQuantity(quantity: number, unit?: string | null): string {
  if (!unit) {
    return `${quantity}`;
  }

  // Zaokrąglij do 2 miejsc po przecinku jeśli nie jest całkowita
  const formatted = quantity % 1 === 0
    ? quantity.toString()
    : quantity.toFixed(2).replace(/\.?0+$/, '');

  return `${formatted} ${unit}`;
}

/**
 * Sugeruje najlepszą jednostkę do wyświetlenia dla danej kategorii
 */
export function suggestBestUnit(quantity: number, category: UnitCategory): string {
  switch (category) {
    case 'volume':
      if (quantity >= 1000) return 'l';
      if (quantity >= 100) return 'dl';
      return 'ml';

    case 'weight':
      if (quantity >= 1000) return 'kg';
      if (quantity >= 10) return 'dag';
      return 'g';

    case 'count':
      return 'szt';

    default:
      return 'szt';
  }
}

