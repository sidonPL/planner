import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type IngredientCost = {
  name: string;
  quantity: number | null;
  unit: string | null;
  pricePerUnit: number | null;
  totalCost: number | null;
  available: boolean;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: recipeId } = await params;

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pobierz przepis ze składnikami
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    let totalCost = 0;
    let hasAllPrices = true;
    const ingredientCosts: IngredientCost[] = [];

    // Oblicz koszt każdego składnika
    for (const ingredient of recipe.ingredients) {
      // Znajdź produkt w inwentarzu
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          householdId: session.user.householdId,
          name: {
            contains: ingredient.name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          price: true,
          unit: true,
          quantity: true,
        },
      });

      if (inventoryItem?.price && ingredient.quantity) {
        // Oblicz koszt składnika
        const cost = inventoryItem.price * ingredient.quantity;
        totalCost += cost;

        ingredientCosts.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          pricePerUnit: inventoryItem.price,
          totalCost: cost,
          available: inventoryItem.quantity >= ingredient.quantity,
        });
      } else {
        hasAllPrices = false;
        ingredientCosts.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          pricePerUnit: null,
          totalCost: null,
          available: inventoryItem ? inventoryItem.quantity >= (ingredient.quantity || 0) : false,
        });
      }
    }

    const costPerServing = totalCost / recipe.servings;

    return NextResponse.json({
      recipeId,
      recipeName: recipe.name,
      servings: recipe.servings,
      totalCost: Math.round(totalCost * 100) / 100,
      costPerServing: Math.round(costPerServing * 100) / 100,
      hasAllPrices,
      completeness: hasAllPrices
        ? 100
        : Math.round(
            (ingredientCosts.filter((i) => i.pricePerUnit !== null).length /
              ingredientCosts.length) *
              100
          ),
      ingredients: ingredientCosts,
    });
  } catch (error) {
    console.error("Error calculating recipe cost:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

