/**
 * Pomocnicze funkcje do duplikacji przepisu
 */

import { Recipe, RecipeIngredient, RecipeStep } from "@prisma/client";

/**
 * Generuje unikalną nazwę dla kopii przepisu
 */
export function generateCopyName(originalName: string, existingNames: string[]): string {
  let copyNumber = 1;
  let newName = `${originalName} (kopia)`;

  while (existingNames.includes(newName)) {
    copyNumber++;
    newName = `${originalName} (kopia ${copyNumber})`;
  }

  return newName;
}

/**
 * Przygotowuje dane przepisu do duplikacji
 */
export function prepareDuplicateRecipe(
  recipe: Recipe & {
    ingredients: RecipeIngredient[];
    steps: RecipeStep[];
  },
  existingRecipeNames: string[]
): {
  recipeData: Omit<Recipe, "id" | "createdAt" | "updatedAt" | "createdById">;
  ingredients: Omit<RecipeIngredient, "id" | "recipeId">[];
  steps: Omit<RecipeStep, "id" | "recipeId">[];
} {
  const newName = generateCopyName(recipe.name, existingRecipeNames);

  return {
    recipeData: {
      name: newName,
      description: recipe.description,
      instructions: recipe.instructions,
      category: recipe.category,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      restTime: recipe.restTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      image: recipe.image,
      videoUrl: recipe.videoUrl,
      source: recipe.source,
      tags: recipe.tags,
      isVegetarian: recipe.isVegetarian,
      isVegan: recipe.isVegan,
      isGlutenFree: recipe.isGlutenFree,
      isDairyFree: recipe.isDairyFree,
      cookingMethod: recipe.cookingMethod,
      ovenTemp: recipe.ovenTemp,
      ovenMode: recipe.ovenMode,
      householdId: recipe.householdId,
      allergens: recipe.allergens,
      calories: recipe.calories,
      carbs: recipe.carbs,
      cuisine: recipe.cuisine,
      fat: recipe.fat,
      fiber: recipe.fiber,
      protein: recipe.protein,
      tips: recipe.tips,
      totalTime: recipe.totalTime,
      isPublic: recipe.isPublic,
    },
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      optional: ing.optional,
      globalIngredientId: ing.globalIngredientId,
    })),
    steps: recipe.steps.map((step) => ({
      content: step.content,
      order: step.order,
      duration: step.duration,
      temperature: step.temperature,
      image: step.image,
      tip: step.tip,
      isOptional: step.isOptional,
    })),
  };
}

