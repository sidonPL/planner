/**
 * Funkcje pomocnicze dla skalowania przepisów
 */

/**
 * Zaokrągla ilość składnika do sensownej wartości
 */
export function roundToSensibleValue(value: number): number {
  // Dla bardzo małych wartości (< 1)
  if (value < 1) {
    // Zaokrąglij do najbliższego ułamka: 1/4, 1/3, 1/2, 2/3, 3/4
    const fractions = [0.25, 0.33, 0.5, 0.67, 0.75];
    const closest = fractions.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    return Math.abs(value - closest) < 0.1 ? closest : Math.round(value * 4) / 4;
  }

  // Dla wartości 1-10
  if (value < 10) {
    return Math.round(value * 2) / 2; // Zaokrąglij do najbliższej połowy
  }

  // Dla wartości 10-100
  if (value < 100) {
    return Math.round(value / 5) * 5; // Zaokrąglij do najbliższej piątki
  }

  // Dla dużych wartości
  return Math.round(value / 10) * 10; // Zaokrąglij do najbliższej dziesiątki
}

/**
 * Skaluje ilość składnika z inteligentnym zaokrągleniem
 */
export function scaleIngredientQuantity(
  originalQuantity: number,
  originalServings: number,
  newServings: number
): number {
  const multiplier = newServings / originalServings;
  const scaledValue = originalQuantity * multiplier;
  return roundToSensibleValue(scaledValue);
}

/**
 * Formatuje ilość składnika z ułamkami
 */
export function formatQuantityWithFractions(quantity: number): string {
  const wholePart = Math.floor(quantity);
  const decimalPart = quantity - wholePart;

  const fractionMap: Record<string, string> = {
    '0.25': '¼',
    '0.33': '⅓',
    '0.5': '½',
    '0.67': '⅔',
    '0.75': '¾',
  };

  const closestFraction = Object.keys(fractionMap).reduce((prev, curr) =>
    Math.abs(parseFloat(curr) - decimalPart) < Math.abs(parseFloat(prev) - decimalPart)
      ? curr
      : prev
  );

  if (Math.abs(parseFloat(closestFraction) - decimalPart) < 0.05) {
    if (wholePart === 0) {
      return fractionMap[closestFraction];
    }
    return `${wholePart} ${fractionMap[closestFraction]}`;
  }

  // Jeśli nie pasuje do ułamka, formatuj normalnie
  return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
}

/**
 * Konwertuje jednostki między systemami (metryczny <-> imperialny)
 */
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const conversions: Record<string, Record<string, number>> = {
    // Objętość
    ml: { l: 0.001, 'fl oz': 0.033814, cup: 0.00422675, tbsp: 0.067628, tsp: 0.202884 },
    l: { ml: 1000, 'fl oz': 33.814, cup: 4.22675, tbsp: 67.628, tsp: 202.884 },
    cup: { ml: 236.588, l: 0.236588, 'fl oz': 8, tbsp: 16, tsp: 48 },
    tbsp: { ml: 14.7868, tsp: 3, cup: 0.0625 },
    tsp: { ml: 4.92892, tbsp: 0.333333, cup: 0.0208333 },

    // Waga
    g: { kg: 0.001, oz: 0.035274, lb: 0.00220462 },
    kg: { g: 1000, oz: 35.274, lb: 2.20462 },
    oz: { g: 28.3495, kg: 0.0283495, lb: 0.0625 },
    lb: { g: 453.592, kg: 0.453592, oz: 16 },
  };

  const fromConversions = conversions[fromUnit.toLowerCase()];
  if (!fromConversions) return null;

  const conversionFactor = fromConversions[toUnit.toLowerCase()];
  if (conversionFactor === undefined) return null;

  return quantity * conversionFactor;
}

/**
 * Sugeruje sensowne jednostki dla danej ilości
 */
export function suggestUnit(quantity: number, currentUnit: string): string {
  const unit = currentUnit.toLowerCase();

  // Konwersje objętości
  if (unit === 'ml' && quantity >= 1000) return 'l';
  if (unit === 'l' && quantity < 1) return 'ml';

  // Konwersje wagi
  if (unit === 'g' && quantity >= 1000) return 'kg';
  if (unit === 'kg' && quantity < 1) return 'g';

  return currentUnit;
}

/**
 * Skaluje cały przepis (wszystkie składniki)
 */
export interface ScaledIngredient {
  name: string;
  originalQuantity: number;
  scaledQuantity: number;
  unit: string;
  formattedQuantity: string;
}

export function scaleRecipe(
  ingredients: Array<{ name: string; quantity: number; unit: string }>,
  originalServings: number,
  newServings: number
): ScaledIngredient[] {
  return ingredients.map((ingredient) => {
    const scaledQuantity = scaleIngredientQuantity(
      ingredient.quantity,
      originalServings,
      newServings
    );

    const suggestedUnit = suggestUnit(scaledQuantity, ingredient.unit);
    const finalQuantity = suggestedUnit !== ingredient.unit
      ? convertUnit(scaledQuantity, ingredient.unit, suggestedUnit) || scaledQuantity
      : scaledQuantity;

    return {
      name: ingredient.name,
      originalQuantity: ingredient.quantity,
      scaledQuantity: finalQuantity,
      unit: suggestedUnit,
      formattedQuantity: formatQuantityWithFractions(finalQuantity),
    };
  });
}

