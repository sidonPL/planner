import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - wygeneruj listę zakupów z posiłków
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Pobierz wszystkie posiłki z przepisami
    const meals = await prisma.tripMeal.findMany({
      where: {
        trip: {
          id,
          householdId: session.user.householdId,
        },
        recipeId: { not: null },
      },
      include: {
        recipe: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    // Agreguj składniki
    const ingredientsMap = new Map<string, { name: string; quantity: number; unit: string }>();

    for (const meal of meals) {
      if (!meal.recipe) continue;

      for (const ingredient of meal.recipe.ingredients) {
        const key = `${ingredient.name}-${ingredient.unit}`;

        if (ingredientsMap.has(key)) {
          const existing = ingredientsMap.get(key)!;
          existing.quantity += ingredient.quantity || 0;
        } else {
          ingredientsMap.set(key, {
            name: ingredient.name,
            quantity: ingredient.quantity || 0,
            unit: ingredient.unit || "szt",
          });
        }
      }
    }

    const shoppingList = Array.from(ingredientsMap.values());

    return NextResponse.json({
      meals: meals.length,
      items: shoppingList,
    });
  } catch (error) {
    console.error("Error generating shopping list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - utwórz listę zakupów w module Shopping
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Pobierz trip
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Pobierz wszystkie posiłki z przepisami
    const meals = await prisma.tripMeal.findMany({
      where: {
        tripId: id,
        recipeId: { not: null },
      },
      include: {
        recipe: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    // Agreguj składniki
    const ingredientsMap = new Map<string, { name: string; quantity: number; unit: string }>();

    for (const meal of meals) {
      if (!meal.recipe) continue;

      for (const ingredient of meal.recipe.ingredients) {
        const key = `${ingredient.name}-${ingredient.unit}`;

        if (ingredientsMap.has(key)) {
          const existing = ingredientsMap.get(key)!;
          existing.quantity += ingredient.quantity || 0;
        } else {
          ingredientsMap.set(key, {
            name: ingredient.name,
            quantity: ingredient.quantity || 0,
            unit: ingredient.unit || "szt",
          });
        }
      }
    }

    // Utwórz shopping items
    const createdItems = [];
    for (const item of ingredientsMap.values()) {
      const shoppingItem = await prisma.shoppingItem.create({
        data: {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          householdId: session.user.householdId,
          category: "INNE", // Możesz dodać logikę auto-kategoryzacji
          notes: `Z planu posiłków - ${trip.name}`,
        },
      });
      createdItems.push(shoppingItem);
    }

    return NextResponse.json({
      success: true,
      itemsCreated: createdItems.length,
      items: createdItems,
    });
  } catch (error) {
    console.error("Error creating shopping list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
