import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tripMealSchema = z.object({
  date: z.string(),
  mealType: z.enum(["śniadanie", "obiad", "kolacja", "przekąska"]),
  recipeId: z.string().optional(),
  customName: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  budget: z.number().optional(),
});

// GET - pobierz meal plan dla wyjazdu
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const meals = await prisma.tripMeal.findMany({
      where: {
        trip: {
          id,
          householdId: session.user.householdId,
        },
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
      orderBy: [
        { date: "asc" },
        { mealType: "asc" },
      ],
    });

    return NextResponse.json(meals);
  } catch (error) {
    console.error("Error fetching trip meals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj posiłek
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy trip istnieje i należy do tego household
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = tripMealSchema.parse(body);

    const meal = await prisma.tripMeal.create({
      data: {
        tripId: id,
        date: new Date(validatedData.date),
        mealType: validatedData.mealType,
        recipeId: validatedData.recipeId,
        customName: validatedData.customName,
        assignedTo: validatedData.assignedTo,
        notes: validatedData.notes,
        budget: validatedData.budget,
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

    return NextResponse.json(meal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating trip meal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
