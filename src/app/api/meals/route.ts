import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { updateQuestProgress } from "@/lib/daily-quests";
const mealSchema = z.object({
  date: z.string(),
  mealType: z.enum(["BREAKFAST", "SECOND_BREAKFAST", "LUNCH", "SNACK", "DINNER"]),
  recipeId: z.string().nullable().optional(),
  customName: z.string().nullable().optional(),
  simpleDishId: z.string().nullable().optional(),
});
// GET - pobierz posiłki
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const meals = await prisma.meal.findMany({
      where: {
        householdId: session.user.householdId,
        ...(startDate && endDate
          ? {
              date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }
          : {}),
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
      orderBy: {
        date: "asc",
      },
    });
    return NextResponse.json(meals);
  } catch (error) {
    console.error("Error fetching meals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
// POST - dodaj posiłek
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const validatedData = mealSchema.parse(body);
    const existingMeal = await prisma.meal.findFirst({
      where: {
        householdId: session.user.householdId,
        date: new Date(validatedData.date),
        mealType: validatedData.mealType,
      },
    });
    let meal;
    if (existingMeal) {
      meal = await prisma.meal.update({
        where: { id: existingMeal.id },
        data: {
          recipeId: validatedData.recipeId,
          customName: validatedData.customName,
          simpleDishId: validatedData.simpleDishId,
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
    } else {
      meal = await prisma.meal.create({
        data: {
          date: new Date(validatedData.date),
          mealType: validatedData.mealType,
          recipeId: validatedData.recipeId,
          customName: validatedData.customName,
          simpleDishId: validatedData.simpleDishId,
          householdId: session.user.householdId,
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

      // Update daily quest progress (only for new meals)
      await updateQuestProgress(session.user.id, 'MEALS', 1);
    }
    // Revalidate calendar and meals pages to refresh data
    revalidatePath('/calendar');
    revalidatePath('/meals');
    return NextResponse.json(meal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating meal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
