import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * POST /api/meals/ai-suggestions
 *
 * Get AI meal suggestions for the week
 *
 * Body: {
 *   startDate: string; // ISO date
 *   preferences?: {
 *     includeCategories?: string[];
 *     excludeRecipes?: string[];
 *     balanceNutrition?: boolean;
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startDate, preferences = {} } = await req.json();

    // Get user's recipes
    const recipes = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        favorites: {
          where: {
            userId: session.user.id,
          },
        },
        ratings: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    // Get recently cooked recipes (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentMeals = await prisma.meal.findMany({
      where: {
        householdId: session.user.householdId,
        date: {
          gte: twoWeeksAgo,
        },
      },
      select: {
        recipeId: true,
      },
    });

    const recentRecipeIds = new Set(
      recentMeals.map(m => m.recipeId).filter(Boolean) as string[]
    );

    // Filter and score recipes
    const scoredRecipes = recipes
      .filter(r => {
        // Exclude recently cooked
        if (recentRecipeIds.has(r.id)) return false;

        // Exclude user-specified
        if (preferences.excludeRecipes?.includes(r.id)) return false;

        // Include only specified categories if provided
        if (preferences.includeCategories && preferences.includeCategories.length > 0) {
          return preferences.includeCategories.includes(r.category || "");
        }

        return true;
      })
      .map(r => {
        let score = 0;

        // Boost favorites
        if (r.favorites.length > 0) score += 10;

        // Boost highly rated
        if (r.ratings.length > 0) {
          const avgRating = r.ratings.reduce((sum, rating) => sum + rating.rating, 0) / r.ratings.length;
          score += avgRating * 2;
        }

        // Prefer variety in difficulty
        if (r.difficulty === "EASY") score += 2;

        // Prefer shorter cooking times for weekdays
        if (r.totalTime && r.totalTime < 45) score += 3;

        return { recipe: r, score };
      })
      .sort((a, b) => b.score - a.score);

    type MealSuggestion = {
      recipeId: string;
      recipeName: string;
      category: string | null;
      totalTime: number | null;
      difficulty: string;
    };

    type DaySuggestion = {
      date: string;
      meals: Record<string, MealSuggestion>;
    };

    // Generate suggestions for 7 days
    const suggestions: DaySuggestion[] = [];
    const date = new Date(startDate);

    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(date);
      currentDate.setDate(date.getDate() + day);

      const daySuggestions: DaySuggestion = {
        date: currentDate.toISOString().split("T")[0],
        meals: {},
      };

      // Suggest main meals (lunch & dinner)
      ["LUNCH", "DINNER"].forEach((mealType, index) => {
        const availableRecipes = scoredRecipes.filter(sr => {
          // Lunch: prefer lighter, faster
          if (mealType === "LUNCH") {
            return sr.recipe.category !== "dessert" &&
                   (sr.recipe.totalTime || 0) < 60;
          }
          // Dinner: can be more elaborate
          return sr.recipe.category !== "dessert" &&
                 sr.recipe.category !== "breakfast";
        });

        const selectedRecipe = availableRecipes[day * 2 + index]?.recipe;

        if (selectedRecipe) {
          daySuggestions.meals[mealType] = {
            recipeId: selectedRecipe.id,
            recipeName: selectedRecipe.name,
            category: selectedRecipe.category,
            totalTime: selectedRecipe.totalTime,
            difficulty: selectedRecipe.difficulty,
          };
        }
      });

      suggestions.push(daySuggestions);
    }

    return NextResponse.json({
      suggestions,
      totalRecipes: scoredRecipes.length,
      metadata: {
        startDate,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

