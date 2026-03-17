import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";
import { detectCategory } from "@/hooks/useShoppingListGroups";

/**
 * POST /api/meals/generate-shopping-list
 *
 * Generate shopping list from meals in date range
 *
 * Body: {
 *   startDate: string;
 *   endDate: string;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startDate, endDate } = await req.json();

    // Get all meals in date range with recipes
    const meals = await prisma.meal.findMany({
      where: {
        householdId: session.user.householdId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        recipeId: {
          not: null,
        },
      },
      include: {
        recipe: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    // Aggregate ingredients
    const ingredientMap = new Map<string, {
      name: string;
      quantity: number;
      unit: string | null;
      recipes: string[];
    }>();

    meals.forEach(meal => {
      if (!meal.recipe) return;

      const recipe = meal.recipe; // Type guard

      recipe.ingredients.forEach(ingredient => {
        const key = `${ingredient.name.toLowerCase()}-${ingredient.unit || ""}`;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.quantity += Number(ingredient.quantity || 0);
          existing.recipes.push(recipe.name);
        } else {
          ingredientMap.set(key, {
            name: ingredient.name,
            quantity: Number(ingredient.quantity || 0),
            unit: ingredient.unit,
            recipes: [recipe.name],
          });
        }
      });
    });

    // Create shopping items
    const shoppingItems = await Promise.all(
      Array.from(ingredientMap.values()).map(async (item) => {
        const category = detectCategory(item.name);

        return prisma.shoppingItem.create({
          data: {
            name: item.name,
            quantity: item.quantity > 0 ? item.quantity : null,
            unit: item.unit,
            category,
            householdId: session.user.householdId!,
            addedBy: session.user.id,
            notes: `Z jadłospisu (${item.recipes.length} przepisów)`,
            isPurchased: false,
            isUrgent: false,
          },
        });
      })
    );

    return NextResponse.json({
      message: "Shopping list created from meal plan",
      items: shoppingItems,
      count: shoppingItems.length,
      dateRange: {
        from: startDate,
        to: endDate,
      },
      mealsIncluded: meals.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

