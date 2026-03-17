/**
 * Seasonal Tags & Smart Filters for Recipes
 */

export const seasonalTags = {
  spring: {
    name: "Wiosna",
    icon: "🌸",
    color: "bg-green-100 text-green-800",
    months: [3, 4, 5], // Marzec, Kwiecień, Maj
    ingredients: [
      "szparagi",
      "szczaw",
      "rzodkiewka",
      "rukola",
      "szpinak",
      "młoda marchew",
      "botwina",
      "rabarbar",
      "truskawki",
    ],
  },
  summer: {
    name: "Lato",
    icon: "☀️",
    color: "bg-yellow-100 text-yellow-800",
    months: [6, 7, 8], // Czerwiec, Lipiec, Sierpień
    ingredients: [
      "pomidor",
      "ogórek",
      "papryka",
      "cukinia",
      "bakłażan",
      "maliny",
      "borówki",
      "wiśnie",
      "brzoskwinie",
      "arbuz",
      "melon",
      "truskawki",
    ],
  },
  autumn: {
    name: "Jesień",
    icon: "🍂",
    color: "bg-orange-100 text-orange-800",
    months: [9, 10, 11], // Wrzesień, Październik, Listopad
    ingredients: [
      "dynia",
      "grzyby",
      "jabłko",
      "gruszka",
      "śliwka",
      "buraki",
      "kapusta",
      "por",
      "ziemniaki",
      "kasztany",
    ],
  },
  winter: {
    name: "Zima",
    icon: "❄️",
    color: "bg-blue-100 text-blue-800",
    months: [12, 1, 2], // Grudzień, Styczeń, Luty
    ingredients: [
      "kapusta kiszona",
      "buraki",
      "marchew",
      "ziemniaki",
      "cebula",
      "czosnek",
      "pietruszka",
      "seler",
      "por",
      "jarmuż",
    ],
  },
};

export const dietaryFilters = {
  vegetarian: {
    name: "Wegetariańskie",
    icon: "🥬",
    color: "bg-green-100 text-green-800",
    check: (recipe: { isVegetarian: boolean }) => recipe.isVegetarian,
  },
  vegan: {
    name: "Wegańskie",
    icon: "🌱",
    color: "bg-green-100 text-green-800",
    check: (recipe: { isVegan: boolean }) => recipe.isVegan,
  },
  glutenFree: {
    name: "Bezglutenowe",
    icon: "🌾",
    color: "bg-yellow-100 text-yellow-800",
    check: (recipe: { isGlutenFree: boolean }) => recipe.isGlutenFree,
  },
  dairyFree: {
    name: "Bez nabiału",
    icon: "🥛",
    color: "bg-blue-100 text-blue-800",
    check: (recipe: { isDairyFree: boolean }) => recipe.isDairyFree,
  },
};

export const timeFilters = {
  quick: {
    name: "Szybkie (<30 min)",
    icon: "⚡",
    maxTime: 30,
  },
  medium: {
    name: "Średnie (30-60 min)",
    icon: "⏱️",
    minTime: 30,
    maxTime: 60,
  },
  long: {
    name: "Długie (>60 min)",
    icon: "🕐",
    minTime: 60,
  },
};

export const mealTypeFilters = {
  breakfast: {
    name: "Śniadanie",
    icon: "🍳",
    categories: ["breakfast", "sniadanie"],
  },
  lunch: {
    name: "Obiad",
    icon: "🍽️",
    categories: ["lunch", "obiad", "main", "soup"],
  },
  dinner: {
    name: "Kolacja",
    icon: "🌙",
    categories: ["dinner", "kolacja"],
  },
  dessert: {
    name: "Deser",
    icon: "🍰",
    categories: ["dessert", "deser", "cake"],
  },
  snack: {
    name: "Przekąska",
    icon: "🥨",
    categories: ["snack", "przekaska"],
  },
};

/**
 * Determine current season based on month
 */
export function getCurrentSeason(): keyof typeof seasonalTags {
  const month = new Date().getMonth() + 1; // 1-12

  for (const [key, season] of Object.entries(seasonalTags)) {
    if (season.months.includes(month)) {
      return key as keyof typeof seasonalTags;
    }
  }

  return "spring"; // fallback
}

/**
 * Check if recipe contains seasonal ingredients
 */
export function hasSeasonalIngredients(
  ingredients: Array<{ name: string }>,
  season: keyof typeof seasonalTags
): boolean {
  const seasonalIngredients = seasonalTags[season].ingredients;

  return ingredients.some((ing) =>
    seasonalIngredients.some((seasonal) =>
      ing.name.toLowerCase().includes(seasonal.toLowerCase())
    )
  );
}

/**
 * Get seasonal tag for recipe
 */
export function getSeasonalTag(
  ingredients: Array<{ name: string }>
): keyof typeof seasonalTags | null {
  for (const [key] of Object.entries(seasonalTags)) {
    if (hasSeasonalIngredients(ingredients, key as keyof typeof seasonalTags)) {
      return key as keyof typeof seasonalTags;
    }
  }

  return null;
}

/**
 * Smart filter recipes by multiple criteria
 */
export interface SmartFilterCriteria {
  season?: keyof typeof seasonalTags | "current";
  dietary?: Array<keyof typeof dietaryFilters>;
  timeRange?: keyof typeof timeFilters;
  mealType?: keyof typeof mealTypeFilters;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  servings?: { min?: number; max?: number };
  calories?: { min?: number; max?: number };
}

export function applySmartFilters<T extends {
  ingredients: Array<{ name: string }>;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  prepTime?: number | null;
  cookTime?: number | null;
  difficulty: string;
  category?: string | null;
  servings: number;
  calories?: number | null;
}>(recipes: T[], criteria: SmartFilterCriteria): T[] {
  return recipes.filter((recipe) => {
    // Season filter
    if (criteria.season) {
      const season = criteria.season === "current" ? getCurrentSeason() : criteria.season;
      if (!hasSeasonalIngredients(recipe.ingredients, season)) {
        return false;
      }
    }

    // Dietary filters
    if (criteria.dietary && criteria.dietary.length > 0) {
      const passesAll = criteria.dietary.every((diet) => {
        const filter = dietaryFilters[diet];
        return filter.check(recipe);
      });
      if (!passesAll) return false;
    }

    // Time filter
    if (criteria.timeRange) {
      const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
      const timeFilter = timeFilters[criteria.timeRange];

      if ('maxTime' in timeFilter && timeFilter.maxTime && totalTime > timeFilter.maxTime) return false;
      if ('minTime' in timeFilter && timeFilter.minTime && totalTime < timeFilter.minTime) return false;
    }

    // Meal type filter
    if (criteria.mealType && recipe.category) {
      const mealFilter = mealTypeFilters[criteria.mealType];
      if (!mealFilter.categories.includes(recipe.category.toLowerCase())) {
        return false;
      }
    }

    // Difficulty filter
    if (criteria.difficulty && recipe.difficulty !== criteria.difficulty) {
      return false;
    }

    // Servings filter
    if (criteria.servings) {
      if (criteria.servings.min && recipe.servings < criteria.servings.min) return false;
      if (criteria.servings.max && recipe.servings > criteria.servings.max) return false;
    }

    // Calories filter
    if (criteria.calories && recipe.calories) {
      if (criteria.calories.min && recipe.calories < criteria.calories.min) return false;
      if (criteria.calories.max && recipe.calories > criteria.calories.max) return false;
    }

    return true;
  });
}

