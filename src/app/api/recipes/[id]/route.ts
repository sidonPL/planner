import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const recipeUpdateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  image: z.string().nullish(),
  category: z.string().nullish(),
  cuisine: z.string().nullish(),

  // Czasy
  prepTime: z.number().nullish(),
  cookTime: z.number().nullish(),
  restTime: z.number().nullish(),
  totalTime: z.number().nullish(),

  // Parametry gotowania
  cookingMethod: z.union([
    z.enum(["BAKING", "FRYING", "BOILING", "STEAMING", "GRILLING", "ROASTING", "STEWING", "SAUTEING", "AIR_FRYING", "MIXING", "OTHER"]),
    z.null(),
    z.undefined()
  ]).optional().nullable().transform((val) => !val ? null : val),
  ovenTemp: z.number().nullish(),
  ovenMode: z.union([
    z.enum(["CONVENTIONAL", "FAN_ASSISTED", "GRILL", "PIZZA"]),
    z.null(),
    z.undefined()
  ]).optional().nullable().transform((val) => !val ? null : val),

  servings: z.number().min(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  tags: z.array(z.string()).optional(),

  // Wartości odżywcze
  calories: z.number().nullish(),
  protein: z.number().nullish(),
  carbs: z.number().nullish(),
  fat: z.number().nullish(),
  fiber: z.number().nullish(),

  // Dodatkowe
  tips: z.string().nullish(),
  source: z.string().nullish(),
  videoUrl: z.string().nullish(),

  // Diety i alergeny
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  isDairyFree: z.boolean().optional(),
  allergens: z.array(z.string()).optional(),

  // Publiczny przepis
  isPublic: z.boolean().optional().default(false),

  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().nullish(),
      unit: z.string().nullish(),
      optional: z.boolean().optional(),
    })
  ),
  steps: z.array(
    z.object({
      content: z.string().min(1),
      duration: z.number().nullish(),
      image: z.string().nullish(),
      temperature: z.number().nullish(),
      tip: z.string().nullish(),
      isOptional: z.boolean().optional(),
      ingredientIds: z.array(z.number()).optional().default([]),
    })
  ),
});

// GET - pobierz pojedynczy przepis
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        ingredients: true,
        steps: {
          include: {
            stepIngredients: {
              include: {
                ingredient: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        favorites: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - zaktualizuj przepis
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
    const validatedData = recipeUpdateSchema.parse(body);

    // Sprawdź czy przepis istnieje i należy do gospodarstwa
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Usuń stare składniki i kroki
    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: id },
    });

    await prisma.recipeStep.deleteMany({
      where: { recipeId: id },
    });

    // Zaktualizuj przepis i utwórz nowe składniki i kroki
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        image: validatedData.image,
        category: validatedData.category,
        cuisine: validatedData.cuisine,

        // Czasy
        prepTime: validatedData.prepTime,
        cookTime: validatedData.cookTime,
        restTime: validatedData.restTime,
        totalTime: validatedData.totalTime,

        // Parametry gotowania
        cookingMethod: validatedData.cookingMethod,
        ovenTemp: validatedData.ovenTemp,
        ovenMode: validatedData.ovenMode,

        servings: validatedData.servings,
        difficulty: validatedData.difficulty,
        tags: validatedData.tags || [],

        // Wartości odżywcze
        calories: validatedData.calories,
        protein: validatedData.protein,
        carbs: validatedData.carbs,
        fat: validatedData.fat,
        fiber: validatedData.fiber,

        // Dodatkowe
        tips: validatedData.tips,
        source: validatedData.source,
        videoUrl: validatedData.videoUrl,

        // Diety i alergeny
        isVegetarian: validatedData.isVegetarian,
        isVegan: validatedData.isVegan,
        isGlutenFree: validatedData.isGlutenFree,
        isDairyFree: validatedData.isDairyFree,
        allergens: validatedData.allergens || [],

        // Publiczny przepis
        isPublic: validatedData.isPublic || false,

        ingredients: {
          create: validatedData.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            optional: ing.optional || false,
          })),
        },
        steps: {
          create: validatedData.steps.map((step, index) => ({
            order: index + 1,
            content: step.content,
            duration: step.duration,
            image: step.image,
            temperature: step.temperature,
            tip: step.tip,
            isOptional: step.isOptional || false,
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
          },
        },
      },
    });

    // Dodaj relacje stepIngredients
    for (let i = 0; i < validatedData.steps.length; i++) {
      const step = validatedData.steps[i];
      const createdStep = recipe.steps[i];

      if (step.ingredientIds && step.ingredientIds.length > 0) {
        // Konwertuj indeksy składników na ID z bazy danych
        const stepIngredients = step.ingredientIds
          .filter((idx: number) => idx < recipe.ingredients.length)
          .map((idx: number) => ({
            stepId: createdStep.id,
            ingredientId: recipe.ingredients[idx].id,
          }));

        if (stepIngredients.length > 0) {
          await prisma.stepIngredient.createMany({
            data: stepIngredients,
          });
        }
      }
    }

    // Pobierz zaktualizowany przepis z relacjami stepIngredients
    const updatedRecipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            stepIngredients: true,
          },
        },
        steps: {
          include: {
            stepIngredients: {
              include: {
                ingredient: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating recipe:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - zaktualizuj przepis (alias do PUT dla kompatybilności)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(req, context);
}

// DELETE - usuń przepis
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

    const recipe = await prisma.recipe.deleteMany({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (recipe.count === 0) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

