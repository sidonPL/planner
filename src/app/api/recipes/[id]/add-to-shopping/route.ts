import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";
import { detectCategory } from "@/hooks/useShoppingListGroups";

/**
 * POST /api/recipes/[id]/add-to-shopping
 *
 * Add recipe ingredients to shopping list
 *
 * Body: {
 *   servings?: number; // Scale ingredients
 *   selectedIngredients?: string[]; // IDs of specific ingredients to add
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { servings, selectedIngredients } = await req.json();

    // Get recipe with ingredients
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: true,
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Filter ingredients if selectedIngredients provided
    let ingredientsToAdd = recipe.ingredients;
    if (selectedIngredients && Array.isArray(selectedIngredients)) {
      ingredientsToAdd = recipe.ingredients.filter(ing =>
        selectedIngredients.includes(ing.id)
      );
    }

    // Calculate serving multiplier
    const multiplier = servings && recipe.servings ? servings / recipe.servings : 1;

    // Add ingredients to shopping list
    const shoppingItems = await Promise.all(
      ingredientsToAdd.map(async (ingredient) => {
        const quantity = ingredient.quantity
          ? Number(ingredient.quantity) * multiplier
          : null;

        // Auto-detect category
        const category = detectCategory(ingredient.name);

        return prisma.shoppingItem.create({
          data: {
            name: ingredient.name,
            quantity,
            unit: ingredient.unit,
            category,
            householdId: session.user.householdId!,
            addedBy: session.user.id,
            notes: `Z przepisu: ${recipe.name}`,
            isPurchased: false,
            isUrgent: false,
          },
        });
      })
    );

    return NextResponse.json({
      message: "Ingredients added to shopping list",
      items: shoppingItems,
      count: shoppingItems.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

