import { Recipe, RecipeIngredient, RecipeStep, FavoriteRecipe } from "@prisma/client";

/**
 * Rozszerzony typ Recipe z relacjami - używany w całej aplikacji
 */
export type RecipeData = Recipe & {
  ingredients?: (RecipeIngredient & { stepIngredients?: { ingredientId: string }[] })[];
  steps?: (RecipeStep & { stepIngredients?: { ingredientId: string }[] })[];
  createdBy?: { id: string; name: string | null };
  favorites?: FavoriteRecipe[];
};

