import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pobierz przepis ze składnikami
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            globalIngredient: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Agreguj alergeny ze składników
    const allergens = new Set<string>();

    for (const ingredient of recipe.ingredients) {
      // Sprawdź czy składnik jest w inwentarzu (może mieć zeskanowany produkt)
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          householdId: session.user.householdId || undefined,
          name: {
            contains: ingredient.name,
            mode: "insensitive",
          },
        },
        include: {
          scannedProduct: {
            select: {
              allergens: true,
            },
          },
        },
      });

      if (inventoryItem?.scannedProduct?.allergens) {
        inventoryItem.scannedProduct.allergens.forEach((a) => allergens.add(a));
      }
    }

    // Pobierz członków gospodarstwa z ich alergenami
    const householdMembers = await prisma.user.findMany({
      where: {
        householdId: session.user.householdId || undefined,
      },
      select: {
        id: true,
        name: true,
        allergens: true,
      },
    });

    return NextResponse.json({
      recipeId: id,
      recipeName: recipe.name,
      allergens: Array.from(allergens),
      householdMembers,
    });
  } catch (error) {
    console.error("Error fetching recipe allergens:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

