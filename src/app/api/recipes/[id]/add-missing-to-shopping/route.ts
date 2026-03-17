import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRecipeAvailability } from "@/lib/recipe-availability";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: recipeId } = await params;

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { servings, includeOptional = false } = body;

    // Sprawdź dostępność składników
    const availability = await checkRecipeAvailability(
      recipeId,
      session.user.householdId,
      servings
    );

    // Znajdź brakujące składniki
    const missingIngredients = availability.ingredients.filter(
      ing => !ing.available && (includeOptional || !ing.optional)
    );

    if (missingIngredients.length === 0) {
      return NextResponse.json({
        added: 0,
        items: [],
        message: "Wszystkie składniki są dostępne!",
      });
    }

    // Dodaj do listy zakupów
    const createdItems = await Promise.all(
      missingIngredients.map(async (ingredient) => {
        // Sprawdź czy już nie istnieje na liście
        const existing = await prisma.shoppingItem.findFirst({
          where: {
            householdId: session.user.householdId!,
            name: {
              equals: ingredient.ingredientName,
              mode: "insensitive",
            },
            isPurchased: false,
          },
        });

        if (existing) {
          // Zaktualizuj ilość jeśli potrzeba więcej
          if (ingredient.quantityNeeded > (existing.quantity || 0)) {
            return await prisma.shoppingItem.update({
              where: { id: existing.id },
              data: {
                quantity: ingredient.quantityNeeded,
                unit: ingredient.unit,
              },
            });
          }
          return existing;
        }

        // Stwórz nowy element
        return await prisma.shoppingItem.create({
          data: {
            name: ingredient.ingredientName,
            quantity: ingredient.quantityNeeded,
            unit: ingredient.unit,
            category: "Produkty spożywcze",
            householdId: session.user.householdId!,
            isPurchased: false,
            isUrgent: !ingredient.optional,
          },
        });
      })
    );

    return NextResponse.json({
      added: createdItems.length,
      items: createdItems,
      message: `Dodano ${createdItems.length} składnik(ów) do listy zakupów`,
    });
  } catch (error) {
    console.error("Error adding missing ingredients to shopping list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

