/**
 * Oblicza XP dla przepisu na podstawie jego złożoności
 */
export function calculateRecipeXP(recipe: {
  difficulty?: string | null;
  ingredients?: { length: number } | Array<unknown>;
  steps?: { length: number } | Array<unknown>;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  tags?: string[];
}): number {
  let baseXP = 25;

  // Difficulty bonus
  if (recipe.difficulty === 'HARD') {
    baseXP += 15; // Total: 40 XP base
  } else if (recipe.difficulty === 'MEDIUM') {
    baseXP += 10; // Total: 35 XP base
  } else if (recipe.difficulty === 'EASY') {
    baseXP += 5; // Total: 30 XP base
  }

  // Ingredient count bonus
  const ingredientCount = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.length
    : (recipe.ingredients?.length || 0);

  if (ingredientCount > 15) {
    baseXP += 15; // Bardzo dużo składników
  } else if (ingredientCount > 10) {
    baseXP += 10;
  } else if (ingredientCount > 5) {
    baseXP += 5;
  }

  // Step count bonus
  const stepCount = Array.isArray(recipe.steps)
    ? recipe.steps.length
    : (recipe.steps?.length || 0);

  if (stepCount > 10) {
    baseXP += 10; // Bardzo skomplikowany
  } else if (stepCount > 5) {
    baseXP += 5;
  }

  // Time bonus (długie przepisy = więcej XP)
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (totalTime > 120) {
    baseXP += 15; // 2+ godziny
  } else if (totalTime > 60) {
    baseXP += 10; // 1+ godzina
  } else if (totalTime > 30) {
    baseXP += 5;
  }

  // Servings bonus (gotowanie dla rodziny)
  if (recipe.servings && recipe.servings >= 6) {
    baseXP += 10; // Duże rodzinne posiłki
  } else if (recipe.servings && recipe.servings >= 4) {
    baseXP += 5;
  }

  // Tag bonuses
  if (recipe.tags) {
    if (recipe.tags.includes('healthy') || recipe.tags.includes('zdrowe')) {
      baseXP += 10; // Bonus za zdrowe
    }
    if (recipe.tags.includes('vegan') || recipe.tags.includes('vegetarian')) {
      baseXP += 5; // Bonus za wegańskie/wegetariańskie
    }
    if (recipe.tags.includes('gourmet') || recipe.tags.includes('premium')) {
      baseXP += 15; // Bonus za gourmet
    }
  }

  return baseXP;
}

/**
 * Oblicza XP z mnożnikami (streak, weekend, etc.)
 */
export function calculateXPWithMultipliers(
  baseXP: number,
  multipliers?: {
    isWeekend?: boolean;
    streak?: number;
    isFirstTime?: boolean;
    isEarlyBird?: boolean; // przed 9:00
    isSeasonalIngredients?: boolean;
  }
): number {
  let totalXP = baseXP;

  if (multipliers?.isFirstTime) {
    totalXP *= 1.5; // +50% za pierwszy raz
  }

  if (multipliers?.isWeekend) {
    totalXP *= 1.2; // +20% w weekend
  }

  if (multipliers?.streak && multipliers.streak >= 7) {
    totalXP *= 1.3; // +30% za streak 7+
  } else if (multipliers?.streak && multipliers.streak >= 3) {
    totalXP *= 1.15; // +15% za streak 3+
  }

  if (multipliers?.isEarlyBird) {
    totalXP += 5; // +5 XP za gotowanie rano
  }

  if (multipliers?.isSeasonalIngredients) {
    totalXP += 5; // +5 XP za sezonowe składniki
  }

  return Math.round(totalXP);
}

/**
 * Helper do sprawdzenia czy jest weekend
 */
export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Helper do sprawdzenia czy jest rano (przed 9:00)
 */
export function isEarlyBird(): boolean {
  const hour = new Date().getHours();
  return hour < 9;
}

/**
 * Zwraca info o XP dla przepisu (do wyświetlenia w UI)
 */
export function getRecipeXPInfo(
  recipe: Parameters<typeof calculateRecipeXP>[0],
  userStreak?: number
): {
  baseXP: number;
  totalXP: number;
  multipliers: string[];
  bonuses: string[];
} {
  const baseXP = calculateRecipeXP(recipe);
  const multipliers: string[] = [];
  const bonuses: string[] = [];

  // Check multipliers
  if (isWeekend()) {
    multipliers.push('Weekend +20%');
  }

  if (userStreak && userStreak >= 7) {
    multipliers.push('Streak 7+ +30%');
  } else if (userStreak && userStreak >= 3) {
    multipliers.push('Streak 3+ +15%');
  }

  if (isEarlyBird()) {
    bonuses.push('Early Bird +5 XP');
  }

  // Calculate total
  const totalXP = calculateXPWithMultipliers(baseXP, {
    isWeekend: isWeekend(),
    streak: userStreak,
    isEarlyBird: isEarlyBird(),
  });

  return {
    baseXP,
    totalXP,
    multipliers,
    bonuses,
  };
}

