import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { recipeId, servings } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    // Get recipe with ingredients
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Calculate serving multiplier
    const servingMultiplier = servings ? servings / recipe.servings : 1;

    // Add ingredients to shopping list
    const shoppingItems = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        const quantity = ingredient.quantity
          ? ingredient.quantity * servingMultiplier
          : undefined;

        return prisma.shoppingItem.create({
          data: {
            name: ingredient.name,
            quantity,
            unit: ingredient.unit ?? undefined,
            householdId: session.user.householdId!,
            isPurchased: false,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      items: shoppingItems,
      count: shoppingItems.length
    });
  } catch (error) {
    console.error("Error adding recipe to shopping list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

