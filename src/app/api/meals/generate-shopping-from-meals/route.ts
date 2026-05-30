import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const generateFromMealsSchema = z.object({
  startDate: z.string(), // ISO date string
  endDate: z.string(),   // ISO date string
  checkInventory: z.boolean().optional().default(true), // Sprawdź inwentarz i nie dodawaj tego co już mamy
});

// POST - generuj listę zakupów z zaplanowanych posiłków
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { startDate, endDate, checkInventory } = generateFromMealsSchema.parse(body);

    // Pobierz zaplanowane posiłki w zakresie dat
    const meals = await prisma.meal.findMany({
      where: {
        householdId: session.user.householdId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        recipeId: { not: null }, // Tylko posiłki z przepisami (nie simple dishes)
      },
      include: {
        recipe: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    if (meals.length === 0) {
      return NextResponse.json({
        added: 0,
        items: [],
        message: "Brak posiłków z przepisami w wybranym okresie",
      });
    }

    // Pobierz inwentarz jeśli checkInventory = true
    const inventory: Map<string, number> = new Map();
    if (checkInventory) {
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: {
          householdId: session.user.householdId,
        },
      });

      // Mapa: nazwa produktu -> dostępna ilość
      for (const item of inventoryItems) {
        const key = `${item.name.toLowerCase()}|${item.unit || ""}`;
        inventory.set(key, item.quantity);
      }
    }

    // Agreguj składniki z wszystkich posiłków
    const ingredientMap = new Map<
      string,
      {
        quantity: number;
        unit: string | null;
        recipes: string[]; // Lista przepisów które używają tego składnika
      }
    >();

    for (const meal of meals) {
      if (!meal.recipe) continue;

      for (const ingredient of meal.recipe.ingredients) {
        const key = `${ingredient.name.toLowerCase()}|${ingredient.unit || ""}`;
        const existing = ingredientMap.get(key);

        if (existing) {
          existing.quantity += ingredient.quantity || 0;
          if (!existing.recipes.includes(meal.recipe.name)) {
            existing.recipes.push(meal.recipe.name);
          }
        } else {
          ingredientMap.set(key, {
            quantity: ingredient.quantity || 0,
            unit: ingredient.unit,
            recipes: [meal.recipe.name],
          });
        }
      }
    }

    // Dodaj składniki do listy zakupów (z uwzględnieniem inwentarza)
    const shoppingItems = [];
    const skippedItems = [];

    for (const [keyWithUnit, data] of ingredientMap.entries()) {
      const [name, unit] = keyWithUnit.split("|");

      // Sprawdź inwentarz
      let neededQuantity = data.quantity;
      if (checkInventory) {
        const inventoryKey = `${name}|${data.unit || ""}`;
        const available = inventory.get(inventoryKey) || 0;
        neededQuantity = Math.max(0, data.quantity - available);

        if (neededQuantity === 0) {
          skippedItems.push({
            name,
            reason: "already_in_inventory",
            available,
            needed: data.quantity,
          });
          continue;
        }
      }

      // Sprawdź czy już jest na liście zakupów
      const existing = await prisma.shoppingItem.findFirst({
        where: {
          householdId: session.user.householdId,
          name: { equals: name, mode: "insensitive" },
          isPurchased: false,
        },
      });

      if (existing) {
        // Aktualizuj ilość jeśli potrzeba więcej
        if (neededQuantity > (existing.quantity || 0)) {
          const updated = await prisma.shoppingItem.update({
            where: { id: existing.id },
            data: {
              quantity: neededQuantity,
              notes: `Potrzebne do: ${data.recipes.join(", ")}`,
            },
          });
          shoppingItems.push({ ...updated, status: "updated" });
        } else {
          skippedItems.push({
            name,
            reason: "already_on_list",
            quantity: existing.quantity,
          });
        }
      } else {
        // Dodaj nowy produkt
        const item = await prisma.shoppingItem.create({
          data: {
            name,
            quantity: neededQuantity || null,
            unit: unit || null,
            category: "other", // Domyślna kategoria
            notes: `Potrzebne do: ${data.recipes.join(", ")}`,
            householdId: session.user.householdId,
          },
        });
        shoppingItems.push({ ...item, status: "added" });
      }
    }

    return NextResponse.json({
      added: shoppingItems.filter((i) => i.status === "added").length,
      updated: shoppingItems.filter((i) => i.status === "updated").length,
      skipped: skippedItems.length,
      items: shoppingItems,
      skippedItems,
      summary: {
        totalMeals: meals.length,
        totalRecipes: new Set(meals.map((m) => m.recipe?.name).filter(Boolean)).size,
        totalIngredients: ingredientMap.size,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error generating shopping list from meals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

