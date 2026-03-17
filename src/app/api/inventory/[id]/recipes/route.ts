import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Pobierz produkt z inwentarza
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!inventoryItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Znajdź przepisy które używają tego składnika (fuzzy matching)
    const recipes = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
        ingredients: {
          some: {
            name: {
              contains: inventoryItem.name,
              mode: 'insensitive',
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        category: true,
        difficulty: true,
        prepTime: true,
        cookTime: true,
        servings: true,
        ingredients: {
          where: {
            name: {
              contains: inventoryItem.name,
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      inventoryItem: {
        id: inventoryItem.id,
        name: inventoryItem.name,
        quantity: inventoryItem.quantity,
        unit: inventoryItem.unit,
      },
      recipes: recipes.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        image: recipe.image,
        category: recipe.category,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        usedIn: recipe.ingredients.map((ing) => ({
          quantity: ing.quantity,
          unit: ing.unit,
          name: ing.name,
        })),
      })),
      count: recipes.length,
    });
  } catch (error) {
    console.error("Error finding recipes with ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

