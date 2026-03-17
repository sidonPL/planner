import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tripMealUpdateSchema = z.object({
  date: z.string().optional(),
  mealType: z.enum(["śniadanie", "obiad", "kolacja", "przekąska"]).optional(),
  recipeId: z.string().optional().nullable(),
  customName: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
});

// PATCH - aktualizuj posiłek
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, mealId } = await params;

    const meal = await prisma.tripMeal.findFirst({
      where: {
        id: mealId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = tripMealUpdateSchema.parse(body);

    const updated = await prisma.tripMeal.update({
      where: { id: mealId },
      data: {
        ...validatedData,
        date: validatedData.date ? new Date(validatedData.date) : undefined,
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            image: true,
            prepTime: true,
            cookTime: true,
            servings: true,
            ingredients: {
              select: {
                id: true,
                name: true,
                quantity: true,
                unit: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating trip meal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń posiłek
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, mealId } = await params;

    const meal = await prisma.tripMeal.findFirst({
      where: {
        id: mealId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    await prisma.tripMeal.delete({
      where: { id: mealId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trip meal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
