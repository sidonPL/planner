/**
 * Kalkulator wartości odżywczych dla przepisów
 * Sumuje wartości odżywcze ze składników i oblicza na porcję
 */

interface NutritionData {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  salt?: number;
  sugar?: number;
  saturatedFat?: number;
}

interface Ingredient {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  nutrition?: NutritionData | null;
}

interface NutritionSummary {
  total: NutritionData;
  perServing: NutritionData;
  servings: number;
  ingredientsWithNutrition: number;
  totalIngredients: number;
  completeness: number; // 0-100%
  nutriScore?: string; // A-E
}

/**
 * Oblicz wartości odżywcze dla przepisu
 */
export function calculateRecipeNutrition(
  ingredients: Ingredient[],
  servings: number = 4
): NutritionSummary {
  const total: NutritionData = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    salt: 0,
    sugar: 0,
    saturatedFat: 0,
  };

  let ingredientsWithNutrition = 0;

  // Sumuj wartości odżywcze ze wszystkich składników
  ingredients.forEach((ingredient) => {
    if (!ingredient.nutrition) return;

    // Jeśli składnik ma wartości odżywcze
    const quantity = ingredient.quantity || 0;
    const multiplier = getQuantityMultiplier(quantity, ingredient.unit);

    if (ingredient.nutrition.calories) {
      total.calories! += ingredient.nutrition.calories * multiplier;
    }
    if (ingredient.nutrition.protein) {
      total.protein! += ingredient.nutrition.protein * multiplier;
    }
    if (ingredient.nutrition.carbohydrates) {
      total.carbohydrates! += ingredient.nutrition.carbohydrates * multiplier;
    }
    if (ingredient.nutrition.fat) {
      total.fat! += ingredient.nutrition.fat * multiplier;
    }
    if (ingredient.nutrition.fiber) {
      total.fiber! += ingredient.nutrition.fiber * multiplier;
    }
    if (ingredient.nutrition.salt) {
      total.salt! += ingredient.nutrition.salt * multiplier;
    }
    if (ingredient.nutrition.sugar) {
      total.sugar! += ingredient.nutrition.sugar * multiplier;
    }
    if (ingredient.nutrition.saturatedFat) {
      total.saturatedFat! += ingredient.nutrition.saturatedFat * multiplier;
    }

    ingredientsWithNutrition++;
  });

  // Oblicz na porcję
  const perServing: NutritionData = {
    calories: Math.round((total.calories || 0) / servings),
    protein: roundToDecimal((total.protein || 0) / servings, 2),
    carbohydrates: roundToDecimal((total.carbohydrates || 0) / servings, 2),
    fat: roundToDecimal((total.fat || 0) / servings, 2),
    fiber: roundToDecimal((total.fiber || 0) / servings, 2),
    salt: roundToDecimal((total.salt || 0) / servings, 2),
    sugar: roundToDecimal((total.sugar || 0) / servings, 2),
    saturatedFat: roundToDecimal((total.saturatedFat || 0) / servings, 2),
  };

  // Oblicz kompletność (ile składników ma wartości odżywcze)
  const completeness = ingredients.length > 0
    ? Math.round((ingredientsWithNutrition / ingredients.length) * 100)
    : 0;

  // Oblicz Nutri-Score (uproszczony)
  const nutriScore = calculateNutriScore(perServing);

  return {
    total,
    perServing,
    servings,
    ingredientsWithNutrition,
    totalIngredients: ingredients.length,
    completeness,
    nutriScore,
  };
}

/**
 * Konwersja jednostek na mnożnik (względem 100g/100ml)
 */
function getQuantityMultiplier(quantity: number, unit?: string | null): number {
  if (!unit) return quantity / 100; // Domyślnie zakładamy 100g

  const unitLower = unit.toLowerCase();

  // Waga
  if (unitLower === "kg") return quantity * 10; // 1kg = 1000g = 10 * 100g
  if (unitLower === "g") return quantity / 100; // 100g = 1 * 100g
  if (unitLower === "dag") return quantity / 10; // 10dag = 100g

  // Objętość (zakładamy że 1ml ≈ 1g)
  if (unitLower === "l") return quantity * 10; // 1L = 1000ml = 10 * 100ml
  if (unitLower === "ml") return quantity / 100; // 100ml = 1 * 100ml

  // Sztuki (zakładamy średnią wagę)
  if (unitLower === "szt") return quantity * 0.5; // 1 szt ≈ 50g (średnio)

  // Łyżki
  if (unitLower === "łyżka" || unitLower === "tbsp") return quantity * 0.15; // 1 łyżka ≈ 15g
  if (unitLower === "łyżeczka" || unitLower === "tsp") return quantity * 0.05; // 1 łyżeczka ≈ 5g

  // Szklanka
  if (unitLower === "szkl" || unitLower === "szklanka") return quantity * 2.5; // 1 szklanka ≈ 250ml

  // Domyślnie
  return quantity / 100;
}

/**
 * Zaokrąglenie do określonej liczby miejsc po przecinku
 */
function roundToDecimal(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Uproszczony algorytm Nutri-Score
 * Ocena od A (najlepszy) do E (najgorszy)
 */
function calculateNutriScore(nutrition: NutritionData): string {
  if (!nutrition.calories) return "?";

  let score = 0;

  // Punkty negatywne (im więcej, tym gorzej)
  const calories = nutrition.calories || 0;
  const sugar = nutrition.sugar || 0;
  const saturatedFat = nutrition.saturatedFat || 0;
  const salt = nutrition.salt || 0;

  // Energia (kcal/100g)
  if (calories > 335) score += 10;
  else if (calories > 270) score += 8;
  else if (calories > 220) score += 6;
  else if (calories > 180) score += 4;
  else if (calories > 80) score += 2;

  // Cukry (g/100g)
  if (sugar > 45) score += 10;
  else if (sugar > 36) score += 9;
  else if (sugar > 31) score += 8;
  else if (sugar > 27) score += 7;
  else if (sugar > 22.5) score += 6;
  else if (sugar > 18) score += 5;
  else if (sugar > 13.5) score += 4;
  else if (sugar > 9) score += 3;
  else if (sugar > 4.5) score += 2;

  // Tłuszcze nasycone (g/100g)
  if (saturatedFat > 10) score += 10;
  else if (saturatedFat > 9) score += 9;
  else if (saturatedFat > 8) score += 8;
  else if (saturatedFat > 7) score += 7;
  else if (saturatedFat > 6) score += 6;
  else if (saturatedFat > 5) score += 5;
  else if (saturatedFat > 4) score += 4;
  else if (saturatedFat > 3) score += 3;
  else if (saturatedFat > 2) score += 2;
  else if (saturatedFat > 1) score += 1;

  // Sól (g/100g)
  if (salt > 0.9) score += 10;
  else if (salt > 0.81) score += 9;
  else if (salt > 0.72) score += 8;
  else if (salt > 0.63) score += 7;
  else if (salt > 0.54) score += 6;
  else if (salt > 0.45) score += 5;
  else if (salt > 0.36) score += 4;
  else if (salt > 0.27) score += 3;
  else if (salt > 0.18) score += 2;
  else if (salt > 0.09) score += 1;

  // Punkty pozytywne (im więcej, tym lepiej - odejmujemy od score)
  const fiber = nutrition.fiber || 0;
  const protein = nutrition.protein || 0;

  // Błonnik (g/100g)
  if (fiber > 4.7) score -= 5;
  else if (fiber > 3.7) score -= 4;
  else if (fiber > 2.8) score -= 3;
  else if (fiber > 1.9) score -= 2;
  else if (fiber > 0.9) score -= 1;

  // Białko (g/100g)
  if (protein > 8) score -= 5;
  else if (protein > 6.4) score -= 4;
  else if (protein > 4.8) score -= 3;
  else if (protein > 3.2) score -= 2;
  else if (protein > 1.6) score -= 1;

  // Konwersja score na literę
  if (score <= -1) return "A";
  if (score <= 2) return "B";
  if (score <= 10) return "C";
  if (score <= 18) return "D";
  return "E";
}

/**
 * Pobierz kolor dla Nutri-Score
 */
export function getNutriScoreColor(score: string): string {
  const colors: Record<string, string> = {
    A: "bg-green-500 text-white",
    B: "bg-lime-500 text-white",
    C: "bg-yellow-500 text-white",
    D: "bg-orange-500 text-white",
    E: "bg-red-500 text-white",
    "?": "bg-gray-400 text-white",
  };
  return colors[score] || colors["?"];
}

