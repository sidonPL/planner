/**
 * System "Co mogę ugotować?" - Reverse search przepisów
 * Znajduje przepisy które można ugotować z dostępnych składników
 */

import { prisma } from './prisma';
import { checkRecipeAvailability } from './recipe-availability';

export interface CookableRecipe {
  recipeId: string;
  recipeName: string;
  recipeImage: string | null;
  recipeCategory: string | null;
  recipeDifficulty: string;
  prepTime: number | null;
  cookTime: number | null;
  servings: number;

  // Dostępność
  availabilityPercentage: number;
  totalIngredients: number;
  availableIngredients: number;
  missingIngredients: number;

  // Szczegóły
  missingItems: Array<{
    name: string;
    quantity: number;
    unit: string | null;
  }>;

  // Score do sortowania
  cookabilityScore: number;
}

export interface CookableRecipesResult {
  perfectMatches: CookableRecipe[];      // 100% dostępne
  almostReady: CookableRecipe[];          // 80-99% dostępne
  needShopping: CookableRecipe[];         // 50-79% dostępne
  totalRecipes: number;
}

/**
 * Oblicza "cookability score" - jak łatwo można ugotować przepis
 * Uwzględnia:
 * - % dostępności składników
 * - Liczbę brakujących składników
 * - Czas przygotowania
 * - Trudność
 */
function calculateCookabilityScore(
  availabilityPercentage: number,
  missingCount: number,
  prepTime: number | null,
  cookTime: number | null,
  difficulty: string
): number {
  let score = 0;

  // Dostępność składników (0-50 punktów)
  score += (availabilityPercentage / 100) * 50;

  // Kara za brakujące składniki (-2 punkty za każdy)
  score -= missingCount * 2;

  // Bonus za szybkość (0-20 punktów)
  const totalTime = (prepTime || 0) + (cookTime || 0);
  if (totalTime <= 15) score += 20;
  else if (totalTime <= 30) score += 15;
  else if (totalTime <= 45) score += 10;
  else if (totalTime <= 60) score += 5;

  // Bonus za łatwość (0-10 punktów)
  if (difficulty === 'EASY') score += 10;
  else if (difficulty === 'MEDIUM') score += 5;

  return Math.max(0, score);
}

/**
 * Znajduje przepisy które można ugotować z dostępnych składników
 */
export async function findCookableRecipes(
  householdId: string,
  options: {
    minAvailability?: number;     // Minimalny % dostępności (domyślnie 50)
    maxResults?: number;           // Max liczba wyników (domyślnie 50)
    includePartial?: boolean;      // Czy uwzględnić przepisy z brakującymi składnikami
    categories?: string[];         // Filtr po kategoriach
    maxPrepTime?: number;          // Max czas przygotowania w minutach
    difficulty?: string[];         // Filtr po trudności
  } = {}
): Promise<CookableRecipesResult> {
  const {
    minAvailability = 50,
    maxResults = 50,
    includePartial = true,
    categories,
    maxPrepTime,
    difficulty,
  } = options;

  // 1. Pobierz wszystkie przepisy gospodarstwa z podstawowymi filtrami
  const recipes = await prisma.recipe.findMany({
    where: {
      householdId,
      ...(categories && categories.length > 0 ? { category: { in: categories } } : {}),
      ...(maxPrepTime ? {
        OR: [
          { prepTime: { lte: maxPrepTime } },
          { prepTime: null },
        ],
      } : {}),
      ...(difficulty && difficulty.length > 0 ? { difficulty: { in: difficulty as any } } : {}),
    },
    select: {
      id: true,
      name: true,
      image: true,
      category: true,
      difficulty: true,
      prepTime: true,
      cookTime: true,
      servings: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 2. Sprawdź dostępność każdego przepisu
  const cookableRecipes: CookableRecipe[] = [];

  for (const recipe of recipes) {
    try {
      const availability = await checkRecipeAvailability(
        recipe.id,
        householdId
      );

      // Filtruj po minimalnej dostępności
      if (availability.availabilityPercentage < minAvailability) {
        continue;
      }

      // Oblicz cookability score
      const cookabilityScore = calculateCookabilityScore(
        availability.availabilityPercentage,
        availability.missingIngredients,
        recipe.prepTime,
        recipe.cookTime,
        recipe.difficulty
      );

      cookableRecipes.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeImage: recipe.image,
        recipeCategory: recipe.category,
        recipeDifficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        availabilityPercentage: availability.availabilityPercentage,
        totalIngredients: availability.totalIngredients,
        availableIngredients: availability.availableIngredients,
        missingIngredients: availability.missingIngredients,
        missingItems: availability.missing,
        cookabilityScore,
      });
    } catch (error) {
      console.error(`Error checking recipe ${recipe.id}:`, error);
      // Kontynuuj z następnym przepisem
    }
  }

  // 3. Sortuj po cookability score
  cookableRecipes.sort((a, b) => b.cookabilityScore - a.cookabilityScore);

  // 4. Ogranicz wyniki
  const limitedRecipes = cookableRecipes.slice(0, maxResults);

  // 5. Kategoryzuj wyniki
  const perfectMatches = limitedRecipes.filter(r => r.availabilityPercentage === 100);
  const almostReady = limitedRecipes.filter(r => r.availabilityPercentage >= 80 && r.availabilityPercentage < 100);
  const needShopping = includePartial
    ? limitedRecipes.filter(r => r.availabilityPercentage >= 50 && r.availabilityPercentage < 80)
    : [];

  return {
    perfectMatches,
    almostReady,
    needShopping,
    totalRecipes: cookableRecipes.length,
  };
}

/**
 * Szybkie sprawdzenie czy są jakieś przepisy do ugotowania
 */
export async function hasAnyCookableRecipes(householdId: string): Promise<boolean> {
  const result = await findCookableRecipes(householdId, {
    minAvailability: 80,
    maxResults: 1,
  });

  return result.perfectMatches.length > 0 || result.almostReady.length > 0;
}

/**
 * Sugestie przepisów na dziś bazując na dostępności i porze dnia
 */
export async function getTodaysSuggestions(
  householdId: string,
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
): Promise<CookableRecipe[]> {
  const currentHour = new Date().getHours();

  // Automatyczna detekcja pory dnia
  let suggestedCategory: string[] = [];
  if (!mealType) {
    if (currentHour >= 6 && currentHour < 11) {
      suggestedCategory = ['BREAKFAST'];
    } else if (currentHour >= 11 && currentHour < 16) {
      suggestedCategory = ['LUNCH'];
    } else if (currentHour >= 16 && currentHour < 22) {
      suggestedCategory = ['DINNER'];
    } else {
      suggestedCategory = ['SNACK'];
    }
  } else {
    suggestedCategory = [mealType];
  }

  const result = await findCookableRecipes(householdId, {
    minAvailability: 70,
    maxResults: 10,
    categories: suggestedCategory,
    includePartial: true,
  });

  // Zwróć top 5 przepisów
  return [
    ...result.perfectMatches,
    ...result.almostReady,
    ...result.needShopping,
  ].slice(0, 5);
}

