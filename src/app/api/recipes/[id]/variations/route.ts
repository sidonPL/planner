import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createVariationSchema = z.object({
  variationName: z.string().min(1, "Nazwa wariantu jest wymagana"),
  description: z.string().optional(),
  recipeData: z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    instructions: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    prepTime: z.number().nullable().optional(),
    cookTime: z.number().nullable().optional(),
    restTime: z.number().nullable().optional(),
    servings: z.number().min(1).default(4),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    tags: z.array(z.string()).default([]),
    allergens: z.array(z.string()).default([]),
    calories: z.number().nullable().optional(),
    protein: z.number().nullable().optional(),
    carbs: z.number().nullable().optional(),
    fat: z.number().nullable().optional(),
    fiber: z.number().nullable().optional(),
    isVegan: z.boolean().default(false),
    isVegetarian: z.boolean().default(false),
    isGlutenFree: z.boolean().default(false),
    isDairyFree: z.boolean().default(false),
    cuisine: z.string().nullable().optional(),
    cookingMethod: z.enum(["BOILING", "FRYING", "BAKING", "GRILLING", "STEAMING", "SLOW_COOKING", "PRESSURE_COOKING", "RAW"]).nullable().optional(),
    ovenTemp: z.number().nullable().optional(),
    ovenMode: z.enum(["TOP_BOTTOM", "TOP_BOTTOM_FAN", "BOTTOM", "TOP", "FAN", "GRILL", "GRILL_FAN"]).nullable().optional(),
    source: z.string().nullable().optional(),
    videoUrl: z.string().nullable().optional(),
    tips: z.string().nullable().optional(),
    isPublic: z.boolean().default(false),
    ingredients: z.array(z.object({
      name: z.string().min(1),
      quantity: z.number().nullable().optional(),
      unit: z.string().nullable().optional(),
      optional: z.boolean().default(false),
    })),
    steps: z.array(z.object({
      content: z.string().min(1),
      order: z.number(),
      duration: z.number().nullable().optional(),
      temperature: z.number().nullable().optional(),
      image: z.string().nullable().optional(),
      tip: z.string().nullable().optional(),
      isOptional: z.boolean().default(false),
    })),
  }),
});

// GET /api/recipes/[id]/variations - Pobierz wszystkie warianty przepisu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json(
        { error: "User not in household" },
        { status: 403 }
      );
    }

    // Sprawdź czy przepis należy do gospodarstwa użytkownika
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      select: { householdId: true },
    });

    if (!recipe || recipe.householdId !== user.householdId) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Pobierz wszystkie warianty
    const variations = await prisma.recipeVariation.findMany({
      where: { parentRecipeId: id },
      include: {
        variantRecipe: {
          include: {
            ingredients: true,
            steps: {
              orderBy: { order: "asc" },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(variations);
  } catch (error) {
    console.error("Error fetching recipe variations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/recipes/[id]/variations - Utwórz nowy wariant przepisu
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: parentRecipeId } = await params;
    const body = await request.json();

    const validation = createVariationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { variationName, description, recipeData } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json(
        { error: "User not in household" },
        { status: 403 }
      );
    }

    // Sprawdź czy przepis rodzic należy do gospodarstwa użytkownika
    const parentRecipe = await prisma.recipe.findUnique({
      where: { id: parentRecipeId },
      select: { householdId: true, name: true },
    });

    if (!parentRecipe || parentRecipe.householdId !== user.householdId) {
      return NextResponse.json(
        { error: "Parent recipe not found" },
        { status: 404 }
      );
    }

    // Utwórz nowy przepis jako wariant
    const result = await prisma.$transaction(async (tx) => {
      // Utwórz nowy przepis
      const variantRecipe = await tx.recipe.create({
        data: {
          name: recipeData.name,
          description: recipeData.description,
          instructions: recipeData.instructions,
          image: recipeData.image,
          category: recipeData.category,
          prepTime: recipeData.prepTime,
          cookTime: recipeData.cookTime,
          restTime: recipeData.restTime,
          totalTime: (recipeData.prepTime || 0) + (recipeData.cookTime || 0) + (recipeData.restTime || 0),
          servings: recipeData.servings,
          difficulty: recipeData.difficulty,
          tags: recipeData.tags,
          allergens: recipeData.allergens,
          calories: recipeData.calories,
          protein: recipeData.protein,
          carbs: recipeData.carbs,
          fat: recipeData.fat,
          fiber: recipeData.fiber,
          isVegan: recipeData.isVegan,
          isVegetarian: recipeData.isVegetarian,
          isGlutenFree: recipeData.isGlutenFree,
          isDairyFree: recipeData.isDairyFree,
          cuisine: recipeData.cuisine,
          cookingMethod: recipeData.cookingMethod,
          ovenTemp: recipeData.ovenTemp,
          ovenMode: recipeData.ovenMode as "CONVENTIONAL" | "FAN_ASSISTED" | "BOTTOM_HEAT" | "TOP_HEAT" | "GRILL" | "FAN_GRILL" | "DEFROST" | "PIZZA" | "BREAD" | "STEAM" | "COMBINATION" | null | undefined,
          source: recipeData.source,
          videoUrl: recipeData.videoUrl,
          tips: recipeData.tips,
          isPublic: recipeData.isPublic,
          householdId: user.householdId!,
          createdById: session.user.id,
          ingredients: {
            create: recipeData.ingredients.map((ing) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              optional: ing.optional,
            })),
          },
          steps: {
            create: recipeData.steps.map((step) => ({
              content: step.content,
              order: step.order,
              duration: step.duration,
              temperature: step.temperature,
              image: step.image,
              tip: step.tip,
              isOptional: step.isOptional,
            })),
          },
        },
        include: {
          ingredients: true,
          steps: {
            orderBy: { order: "asc" },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      // Utwórz powiązanie wariantu z przepisem rodzicem
      const variation = await tx.recipeVariation.create({
        data: {
          parentRecipeId,
          variantRecipeId: variantRecipe.id,
          variationName,
          description,
          createdById: session.user.id,
        },
        include: {
          variantRecipe: {
            include: {
              ingredients: true,
              steps: {
                orderBy: { order: "asc" },
              },
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      return variation;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe variation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

