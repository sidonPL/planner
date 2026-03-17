import { useMemo } from "react";
import { Recipe, RecipeIngredient, RecipeStep, FavoriteRecipe, StepIngredient } from "@prisma/client";

type RecipeIngredientWithRelations = RecipeIngredient & {
  stepIngredients: StepIngredient[];
};

type RecipeStepWithRelations = RecipeStep & {
  stepIngredients: (StepIngredient & {
    ingredient: RecipeIngredient;
  })[];
};

type RecipeWithRelations = Recipe & {
  ingredients: RecipeIngredientWithRelations[];
  steps: RecipeStepWithRelations[];
  createdBy: { id: string; name: string | null };
  favorites: FavoriteRecipe[];
};

interface FilterOptions {
  searchQuery: string;
  categoryFilter: string;
  difficultyFilter: string;
  quickFilter: string;
  ratingFilter?: string; // all, 4+, 3+
  sortBy: string;
}

/**
 * Hook do filtrowania i sortowania przepisów
 */
export function useRecipeFilters(
  recipes: RecipeWithRelations[],
  filters: FilterOptions
) {
  return useMemo(() => {
    const { searchQuery, categoryFilter, difficultyFilter, quickFilter, ratingFilter = "all", sortBy } = filters;

    return recipes
      .filter((recipe) => {
        const matchesSearch =
          recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = categoryFilter === "all" || recipe.category === categoryFilter;
        const matchesDifficulty = difficultyFilter === "all" || recipe.difficulty === difficultyFilter;

        let matchesQuickFilter = true;
        if (quickFilter === "quick") {
          const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
          matchesQuickFilter = totalTime > 0 && totalTime <= 30;
        } else if (quickFilter === "vegetarian") {
          matchesQuickFilter = recipe.isVegetarian === true;
        } else if (quickFilter === "vegan") {
          matchesQuickFilter = recipe.isVegan === true;
        }

        // Rating filter (based on RecipeRating model)
        let matchesRatingFilter = true;
        if (ratingFilter !== "all") {
          // Note: Recipe type doesn't include ratings relation yet
          // This will work after adding ratings to RecipeWithRelations type
          const recipeWithRating = recipe as unknown as { avgRating?: number };
          const avgRating = recipeWithRating.avgRating || 0;
          if (ratingFilter === "4+") {
            matchesRatingFilter = avgRating >= 4;
          } else if (ratingFilter === "3+") {
            matchesRatingFilter = avgRating >= 3;
          }
        }

        return matchesSearch && matchesCategory && matchesDifficulty && matchesQuickFilter && matchesRatingFilter;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "top-rated":
            // Sort by average rating (highest first)
            {
              const aRating = (a as unknown as { avgRating?: number }).avgRating || 0;
              const bRating = (b as unknown as { avgRating?: number }).avgRating || 0;
              return bRating - aRating;
            }
          case "alphabetical":
            return a.name.localeCompare(b.name, "pl");
          case "alphabetical-desc":
            return b.name.localeCompare(a.name, "pl");
          case "popular":
            return (b.favorites?.length || 0) - (a.favorites?.length || 0);
          case "time-asc":
            return ((a.prepTime || 0) + (a.cookTime || 0)) - ((b.prepTime || 0) + (b.cookTime || 0));
          case "time-desc":
            return ((b.prepTime || 0) + (b.cookTime || 0)) - ((a.prepTime || 0) + (a.cookTime || 0));
          default:
            return 0;
        }
      });
  }, [recipes, filters]);
}

