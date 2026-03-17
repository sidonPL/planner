/**
 * Utility do zarządzania historią przeglądanych przepisów
 */

export interface ViewedRecipe {
  recipeId: string;
  recipeName: string;
  recipeImage: string | null;
  viewedAt: number; // timestamp
  availabilityPercentage: number;
}

const STORAGE_KEY = "cookable-viewed-history";
const MAX_HISTORY = 20;

/**
 * Dodaj przepis do historii
 */
export function addToViewHistory(recipe: {
  recipeId: string;
  recipeName: string;
  recipeImage?: string | null;
  availabilityPercentage: number;
}): void {
  try {
    const history = getViewHistory();

    // Usuń jeśli już istnieje (dodamy na początek)
    const filtered = history.filter(r => r.recipeId !== recipe.recipeId);

    // Dodaj na początek
    const newHistory: ViewedRecipe[] = [
      {
        recipeId: recipe.recipeId,
        recipeName: recipe.recipeName,
        recipeImage: recipe.recipeImage || null,
        viewedAt: Date.now(),
        availabilityPercentage: recipe.availabilityPercentage,
      },
      ...filtered,
    ].slice(0, MAX_HISTORY); // Ogranicz do MAX_HISTORY

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Error adding to view history:", error);
  }
}

/**
 * Pobierz historię przeglądanych
 */
export function getViewHistory(): ViewedRecipe[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const history = JSON.parse(stored) as ViewedRecipe[];

    // Usuń stare wpisy (>30 dni)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return history.filter(r => r.viewedAt > thirtyDaysAgo);
  } catch (error) {
    console.error("Error getting view history:", error);
    return [];
  }
}

/**
 * Wyczyść całą historię
 */
export function clearViewHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing view history:", error);
  }
}

/**
 * Usuń konkretny przepis z historii
 */
export function removeFromHistory(recipeId: string): void {
  try {
    const history = getViewHistory();
    const filtered = history.filter(r => r.recipeId !== recipeId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing from history:", error);
  }
}

