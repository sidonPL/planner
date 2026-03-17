import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RecipeSuggestion {
  id: string;
  name: string;
  image: string | null;
  category: string | null;
  difficulty: string;
  prepTime: number | null;
  cookTime: number | null;
  servings: number;
  availableIngredients: string[];
  missingIngredients: string[];
  matchPercentage: number;
  totalIngredients: number;
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const minMatch = parseInt(searchParams.get("minMatch") || "60");

    // 1. Pobierz produkty z inwentarza (dostępne)
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        householdId: session.user.householdId,
        quantity: {
          gt: 0,
        },
      },
      select: {
        name: true,
        quantity: true,
        unit: true,
      },
    });

    // Normalizuj nazwy produktów z inwentarza (lowercase, bez znaków specjalnych)
    const inventoryNames = new Set(
      inventoryItems.map((item) => normalizeIngredientName(item.name))
    );

    // 2. Pobierz wszystkie przepisy z gospodarstwa
    const recipes = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        ingredients: {
          select: {
            name: true,
            optional: true,
          },
        },
      },
    });

    // 3. Oblicz matching dla każdego przepisu
    const suggestions: RecipeSuggestion[] = recipes
      .map((recipe) => {
        const allIngredients = recipe.ingredients.filter((ing) => !ing.optional);
        const totalIngredients = allIngredients.length;

        if (totalIngredients === 0) {
          return null; // Pomiń przepisy bez składników
        }

        const availableIngredients: string[] = [];
        const missingIngredients: string[] = [];

        allIngredients.forEach((ingredient) => {
          const normalized = normalizeIngredientName(ingredient.name);

          // Sprawdź dokładne dopasowanie lub częściowe
          const isAvailable = inventoryNames.has(normalized) ||
            Array.from(inventoryNames).some((inv) =>
              inv.includes(normalized) || normalized.includes(inv)
            );

          if (isAvailable) {
            availableIngredients.push(ingredient.name);
          } else {
            missingIngredients.push(ingredient.name);
          }
        });

        const matchPercentage = Math.round(
          (availableIngredients.length / totalIngredients) * 100
        );

        return {
          id: recipe.id,
          name: recipe.name,
          image: recipe.image,
          category: recipe.category,
          difficulty: recipe.difficulty,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          availableIngredients,
          missingIngredients,
          matchPercentage,
          totalIngredients,
        };
      })
      .filter((suggestion): suggestion is NonNullable<typeof suggestion> =>
        suggestion !== null && suggestion.matchPercentage >= minMatch
      )
      .sort((a, b) => {
        // Sortuj: najpierw po % dopasowania, potem po liczbie brakujących składników
        if (b.matchPercentage !== a.matchPercentage) {
          return b.matchPercentage - a.matchPercentage;
        }
        return a.missingIngredients.length - b.missingIngredients.length;
      });

    // 4. Grupuj po % dopasowania
    const grouped = {
      perfect: suggestions.filter((s) => s.matchPercentage === 100),
      high: suggestions.filter((s) => s.matchPercentage >= 80 && s.matchPercentage < 100),
      medium: suggestions.filter((s) => s.matchPercentage >= 60 && s.matchPercentage < 80),
    };

    return NextResponse.json({
      suggestions,
      grouped,
      inventoryItemsCount: inventoryItems.length,
      totalRecipes: recipes.length,
    });
  } catch (error) {
    console.error("Error fetching recipe suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Normalizuj nazwę składnika do porównywania
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-ząćęłńóśźż\s]/g, "") // Usuń znaki specjalne, zachowaj polskie
    .replace(/\s+/g, " ") // Normalizuj spacje
    .split(" ")[0]; // Weź tylko pierwsze słowo (np. "mleko 3.2%" -> "mleko")
}

