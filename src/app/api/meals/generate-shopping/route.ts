import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const generateSchema = z.object({
  recipeIds: z.array(z.string()),
});

// POST - generuj listę zakupów z przepisów
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { recipeIds } = generateSchema.parse(body);

    // Pobierz składniki z wybranych przepisów
    const recipes = await prisma.recipe.findMany({
      where: {
        id: { in: recipeIds },
        householdId: session.user.householdId,
      },
      include: {
        ingredients: true,
      },
    });

    // Agreguj składniki (sumuj ilości tych samych produktów)
    const ingredientMap = new Map<string, { quantity: number; unit: string | null }>();

    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const key = ingredient.name.toLowerCase();
        const existing = ingredientMap.get(key);

        if (existing && ingredient.quantity) {
          // Jeśli te same jednostki, sumuj
          if (existing.unit === ingredient.unit) {
            ingredientMap.set(key, {
              quantity: (existing.quantity || 0) + ingredient.quantity,
              unit: ingredient.unit,
            });
          } else {
            // Różne jednostki - dodaj osobno
            ingredientMap.set(`${key}_${ingredient.unit}`, {
              quantity: ingredient.quantity,
              unit: ingredient.unit,
            });
          }
        } else {
          ingredientMap.set(key, {
            quantity: ingredient.quantity || 0,
            unit: ingredient.unit,
          });
        }
      }
    }

    // Dodaj składniki do listy zakupów
    const shoppingItems = [];

    for (const [name, { quantity, unit }] of ingredientMap.entries()) {
      // Sprawdź czy produkt już jest na liście
      const existing = await prisma.shoppingItem.findFirst({
        where: {
          householdId: session.user.householdId,
          name: { contains: name.split("_")[0], mode: "insensitive" },
          isPurchased: false,
        },
      });

      if (!existing) {
        const item = await prisma.shoppingItem.create({
          data: {
            name: name.split("_")[0], // Usuń suffix jednostki
            quantity: quantity || null,
            unit: unit,
            category: "other",
            householdId: session.user.householdId,
          },
        });
        shoppingItems.push(item);
      }
    }

    return NextResponse.json({
      added: shoppingItems.length,
      items: shoppingItems,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Error generating shopping list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

