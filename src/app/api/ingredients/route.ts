import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - pobierz wszystkie unikalne składniki w gospodarstwie
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pobierz wszystkie przepisy w gospodarstwie
    const recipes = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        ingredients: true,
      },
    });

    // Zbierz wszystkie unikalne nazwy składników
    const ingredientNames = new Set<string>();
    recipes.forEach((recipe) => {
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach((ing) => {
          if (ing.name && typeof ing.name === 'string') {
            ingredientNames.add(ing.name.trim());
          }
        });
      }
    });

    // Zwróć posortowaną listę
    const uniqueIngredients = Array.from(ingredientNames).sort((a, b) =>
      a.localeCompare(b, 'pl')
    );

    return NextResponse.json(uniqueIngredients);
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

