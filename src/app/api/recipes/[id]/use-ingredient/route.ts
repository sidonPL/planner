import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    const { ingredientName, barcode, quantity } = body;

    if (!ingredientName) {
      return NextResponse.json(
        { error: "Ingredient name is required" },
        { status: 400 }
      );
    }

    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        householdId: session.user.householdId,
      },
      select: { id: true },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Znajdź produkt w inwentarzu
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        householdId: session.user.householdId,
        OR: [
          {
            name: {
              contains: ingredientName,
              mode: "insensitive",
            },
          },
          ...(barcode ? [{ barcode }] : []),
        ],
        quantity: {
          gt: 0,
        },
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: "Product not found in inventory" },
        { status: 404 }
      );
    }

    // Oblicz ile odjąć (jeśli podano quantity, użyj tego, w przeciwnym razie odejmij 1 jednostkę)
    const quantityToDeduct = quantity || 1;

    if (inventoryItem.quantity < quantityToDeduct) {
      return NextResponse.json(
        {
          error: "Not enough quantity in inventory",
          available: inventoryItem.quantity,
          requested: quantityToDeduct,
        },
        { status: 400 }
      );
    }

    // Zaktualizuj inwentarz
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantity: {
          decrement: quantityToDeduct,
        },
      },
    });

    // Zapisz historię użycia
    await prisma.recipeUsageHistory.create({
      data: {
        recipeId,
        userId: session.user.id,
        householdId: session.user.householdId,
        ingredientName,
        quantityUsed: quantityToDeduct,
        unit: inventoryItem.unit,
        inventoryItemId: inventoryItem.id,
      },
    });

    return NextResponse.json({
      success: true,
      inventoryItem: {
        id: updatedItem.id,
        name: updatedItem.name,
        previousQuantity: inventoryItem.quantity,
        newQuantity: updatedItem.quantity,
        quantityUsed: quantityToDeduct,
        unit: updatedItem.unit,
      },
    });
  } catch (error) {
    console.error("Error using ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

