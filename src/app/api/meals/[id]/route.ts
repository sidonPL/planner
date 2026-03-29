import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PUT - zaktualizuj posiłek (zmiana daty/typu - dla drag & drop)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { date, mealType, recipeId, customName, simpleDishId } = body;

    // Sprawdź czy posiłek należy do gospodarstwa
    const existing = await prisma.meal.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    // Jeśli zmieniamy slot, usuń istniejący posiłek w tym slocie
    if (date && mealType) {
      await prisma.meal.deleteMany({
        where: {
          householdId: session.user.householdId,
          date: new Date(date),
          mealType,
          id: { not: id },
        },
      });
    }

    const updatedMeal = await prisma.meal.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(mealType && { mealType }),
        ...(recipeId !== undefined && { recipeId }),
        ...(customName !== undefined && { customName }),
        ...(simpleDishId !== undefined && { simpleDishId }),
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            prepTime: true,
            cookTime: true,
            image: true,
          },
        },
        simpleDish: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            fiber: true,
          },
        },
      },
    });

    return NextResponse.json(updatedMeal);
  } catch (error) {
    console.error("Error updating meal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń posiłek
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meal = await prisma.meal.deleteMany({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (meal.count === 0) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    // Revalidate calendar and meals pages
    revalidatePath('/calendar');
    revalidatePath('/meals');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

