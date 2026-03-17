/**
 * System sprawdzania dostępności składników dla przepisów
 */

import { prisma } from './prisma';
import { convertUnit, compareQuantities } from './unit-converter';

export interface IngredientAvailability {
  ingredientId: string;
  ingredientName: string;
  quantityNeeded: number;
  unit: string | null;
  optional: boolean;

  // Dopasowanie z inwentarza
  available: boolean;
  inventoryMatch?: {
    id: string;
    name: string;
    quantityAvailable: number;
    unit: string | null;
    imageUrl?: string | null;
    brand?: string | null;
  };

  // Ile mamy vs ile potrzebujemy
  quantityAvailableConverted?: number;
  percentageAvailable?: number;

  // Alternatywy z inwentarza
  alternatives?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string | null;
    similarity: number;
  }>;
}

export interface RecipeAvailability {
  recipeId: string;
  recipeName: string;
  servings: number;

  // Statystyki
  totalIngredients: number;
  availableIngredients: number;
  missingIngredients: number;
  partiallyAvailableIngredients: number;
  optionalMissingIngredients: number;

  // Czy można gotować
  canCook: boolean;
  canCookWithoutOptional: boolean;
  availabilityPercentage: number;

  // Szczegóły składników
  ingredients: IngredientAvailability[];

  // Brakujące składniki (do shopping list)
  missing: Array<{
    name: string;
    quantity: number;
    unit: string | null;
  }>;
}

/**
 * Sprawdza czy nazwa składnika pasuje do produktu w inwentarzu
 * Używa prostego algorytmu podobieństwa stringów
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1.0;

  // Jeden zawiera drugi
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Levenshtein distance (uproszczona wersja)
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Znajduje najlepsze dopasowanie składnika w inwentarzu
 */
async function findBestInventoryMatch(
  ingredientName: string,
  householdId: string
) {
  // Pobierz wszystkie produkty z inwentarza z ilością > 0
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: {
      householdId,
      quantity: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      quantity: true,
      unit: true,
      imageUrl: true,
      brand: true,
    },
  });

  if (inventoryItems.length === 0) {
    return { bestMatch: null, alternatives: [] };
  }

  // Oblicz podobieństwo dla każdego produktu
  const matches = inventoryItems.map(item => ({
    ...item,
    similarity: calculateSimilarity(ingredientName, item.name),
  }));

  // Sortuj po podobieństwie
  matches.sort((a, b) => b.similarity - a.similarity);

  // Najlepsze dopasowanie (jeśli similarity > 0.6)
  const bestMatch = matches[0]?.similarity >= 0.6 ? matches[0] : null;

  // Alternatywy (similarity > 0.4)
  const alternatives = matches
    .filter(m => m.similarity >= 0.4 && m.id !== bestMatch?.id)
    .slice(0, 3);

  return { bestMatch, alternatives };
}

/**
 * Sprawdza dostępność składników dla przepisu
 */
export async function checkRecipeAvailability(
  recipeId: string,
  householdId: string,
  servings?: number
): Promise<RecipeAvailability> {
  // Pobierz przepis ze składnikami
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!recipe) {
    throw new Error('Recipe not found');
  }

  // Oblicz mnożnik porcji
  const servingMultiplier = servings ? servings / recipe.servings : 1;

  // Sprawdź każdy składnik
  const ingredientsAvailability: IngredientAvailability[] = [];

  for (const ingredient of recipe.ingredients) {
    const quantityNeeded = (ingredient.quantity || 1) * servingMultiplier;

    // Znajdź dopasowanie w inwentarzu
    const { bestMatch, alternatives } = await findBestInventoryMatch(
      ingredient.name,
      householdId
    );

    let available = false;
    let quantityAvailableConverted: number | undefined;
    let percentageAvailable: number | undefined;

    if (bestMatch) {
      // Spróbuj skonwertować jednostki
      const converted = convertUnit(
        bestMatch.quantity,
        bestMatch.unit,
        ingredient.unit
      );

      if (converted !== null) {
        quantityAvailableConverted = converted;
        available = compareQuantities(
          bestMatch.quantity,
          bestMatch.unit,
          quantityNeeded,
          ingredient.unit
        );
        percentageAvailable = Math.min(100, (converted / quantityNeeded) * 100);
      } else {
        // Nie można skonwertować jednostek - zakładamy że jest dostępne jeśli ilość > 0
        available = bestMatch.quantity > 0;
        percentageAvailable = 50; // Częściowo dostępne
      }
    }

    ingredientsAvailability.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantityNeeded,
      unit: ingredient.unit,
      optional: ingredient.optional,
      available,
      inventoryMatch: bestMatch ? {
        id: bestMatch.id,
        name: bestMatch.name,
        quantityAvailable: bestMatch.quantity,
        unit: bestMatch.unit,
        imageUrl: bestMatch.imageUrl,
        brand: bestMatch.brand,
      } : undefined,
      quantityAvailableConverted,
      percentageAvailable,
      alternatives: alternatives.map(alt => ({
        id: alt.id,
        name: alt.name,
        quantity: alt.quantity,
        unit: alt.unit,
        similarity: alt.similarity,
      })),
    });
  }

  // Oblicz statystyki
  const totalIngredients = ingredientsAvailability.length;
  const availableIngredients = ingredientsAvailability.filter(i => i.available).length;
  const missingIngredients = ingredientsAvailability.filter(
    i => !i.available && !i.optional
  ).length;
  const partiallyAvailableIngredients = ingredientsAvailability.filter(
    i => !i.available && i.percentageAvailable && i.percentageAvailable > 0
  ).length;
  const optionalMissingIngredients = ingredientsAvailability.filter(
    i => !i.available && i.optional
  ).length;

  // Można gotować jeśli wszystkie wymagane składniki są dostępne
  const canCookWithoutOptional = ingredientsAvailability
    .filter(i => !i.optional)
    .every(i => i.available);

  const canCook = ingredientsAvailability.every(i => i.available || i.optional);

  // Procent dostępności (bez opcjonalnych)
  const requiredIngredients = ingredientsAvailability.filter(i => !i.optional);
  const availabilityPercentage = requiredIngredients.length > 0
    ? (requiredIngredients.filter(i => i.available).length / requiredIngredients.length) * 100
    : 100;

  // Lista brakujących składników
  const missing = ingredientsAvailability
    .filter(i => !i.available && !i.optional)
    .map(i => ({
      name: i.ingredientName,
      quantity: i.quantityNeeded,
      unit: i.unit,
    }));

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    servings: servings || recipe.servings,
    totalIngredients,
    availableIngredients,
    missingIngredients,
    partiallyAvailableIngredients,
    optionalMissingIngredients,
    canCook,
    canCookWithoutOptional,
    availabilityPercentage: Math.round(availabilityPercentage),
    ingredients: ingredientsAvailability,
    missing,
  };
}

/**
 * Sprawdza dostępność wielu przepisów jednocześnie
 */
export async function checkMultipleRecipesAvailability(
  recipeIds: string[],
  householdId: string
): Promise<RecipeAvailability[]> {
  const results = await Promise.all(
    recipeIds.map(id => checkRecipeAvailability(id, householdId))
  );

  return results;
}

