import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const parseNutritionValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// PATCH - zaktualizuj gotowe danie
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, category, description, icon, calories, protein, carbs, fat, fiber } = body;

    // Sprawdź czy danie należy do gospodarstwa
    const existingDish = await prisma.simpleDish.findUnique({
      where: { id },
    });

    if (!existingDish || existingDish.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updatedDish = await prisma.simpleDish.update({
      where: { id },
      data: {
        name: name?.trim() || existingDish.name,
        category: category || existingDish.category,
        description: description !== undefined ? description : existingDish.description,
        icon: icon || existingDish.icon,
        calories: calories !== undefined ? parseNutritionValue(calories) : existingDish.calories,
        protein: protein !== undefined ? parseNutritionValue(protein) : existingDish.protein,
        carbs: carbs !== undefined ? parseNutritionValue(carbs) : existingDish.carbs,
        fat: fat !== undefined ? parseNutritionValue(fat) : existingDish.fat,
        fiber: fiber !== undefined ? parseNutritionValue(fiber) : existingDish.fiber,
      },
    });

    return NextResponse.json(updatedDish);
  } catch (error) {
    console.error("Error updating simple dish:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń gotowe danie
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy danie należy do gospodarstwa
    const existingDish = await prisma.simpleDish.findUnique({
      where: { id },
    });

    if (!existingDish || existingDish.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.simpleDish.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting simple dish:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

