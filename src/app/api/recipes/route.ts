import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { autoSeedIngredients } from "@/lib/seed-ingredients";
import { updateQuestProgress } from "@/lib/daily-quests";
import { handleApiError, unauthorized } from "@/lib/api-error-handler";
import { sanitizePlainText, sanitizeRichHTML, sanitizeURL, sanitizeArray } from "@/lib/sanitize";

const recipeSchema = z.object({
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
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional().nullable().transform((val) => val === "" || !val ? null : val),
  ovenTemp: z.number().nullish(),
  ovenMode: z.union([
    z.enum(["CONVENTIONAL", "FAN_ASSISTED", "GRILL", "PIZZA"]),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional().nullable().transform((val) => val === "" || !val ? null : val),

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

// GET - pobierz przepisy
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-seed składników przy pierwszym użyciu
    await autoSeedIngredients(session.user.householdId);

    const recipes = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
      },
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
          orderBy: {
            order: "asc",
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        favorites: {
          where: {
            userId: session.user.id,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(recipes);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - dodaj przepis
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return unauthorized();
    }

    const body = await req.json();

    // SECURITY: Sanityzacja przed walidacją
    const sanitizedBody = {
      ...body,
      name: sanitizePlainText(body.name),
      description: sanitizeRichHTML(body.description),
      image: sanitizeURL(body.image),
      category: sanitizePlainText(body.category),
      cuisine: sanitizePlainText(body.cuisine),
      tips: sanitizeRichHTML(body.tips),
      source: sanitizePlainText(body.source),
      videoUrl: sanitizeURL(body.videoUrl),
      tags: sanitizeArray(body.tags),
      allergens: sanitizeArray(body.allergens),
      ingredients: body.ingredients?.map((ing: any) => ({
        ...ing,
        name: sanitizePlainText(ing.name),
        unit: sanitizePlainText(ing.unit),
      })),
      steps: body.steps?.map((step: any) => ({
        ...step,
        content: sanitizeRichHTML(step.content),
        image: sanitizeURL(step.image),
        tip: sanitizeRichHTML(step.tip),
      })),
    };

    const validatedData = recipeSchema.parse(sanitizedBody);

    // Automatycznie dodaj/zaktualizuj globalne składniki
    const globalIngredientMap = new Map<string, string>(); // nazwa -> id

    for (const ing of validatedData.ingredients) {
      const ingredientName = ing.name.trim();

      // Sprawdź czy globalny składnik istnieje
      let globalIngredient = await prisma.globalIngredient.findUnique({
        where: {
          householdId_name: {
            householdId: session.user.householdId,
            name: ingredientName,
          },
        },
      });

      if (globalIngredient) {
        // Zwiększ licznik użycia
        globalIngredient = await prisma.globalIngredient.update({
          where: { id: globalIngredient.id },
          data: { usageCount: { increment: 1 } },
        });
      } else {
        // Stwórz nowy globalny składnik
        globalIngredient = await prisma.globalIngredient.create({
          data: {
            name: ingredientName,
            commonUnit: ing.unit || null,
            householdId: session.user.householdId,
            usageCount: 1,
          },
        });
      }

      globalIngredientMap.set(ingredientName, globalIngredient.id);
    }

    // Najpierw tworzymy przepis ze składnikami i krokami
    const recipe = await prisma.recipe.create({
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

        householdId: session.user.householdId,
        createdById: session.user.id,
        ingredients: {
          create: validatedData.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            optional: ing.optional || false,
            globalIngredientId: globalIngredientMap.get(ing.name.trim()) || null,
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
      },
    });

    // Teraz tworzymy relacje między krokami a składnikami
    if (validatedData.steps && validatedData.steps.length > 0) {
      for (let stepIndex = 0; stepIndex < validatedData.steps.length; stepIndex++) {
        const step = validatedData.steps[stepIndex];
        const ingredientIds = step.ingredientIds || [];

        if (ingredientIds.length > 0) {
          const stepId = recipe.steps[stepIndex].id;
          const stepIngredients = ingredientIds
            .filter((ingIndex: number) => ingIndex < recipe.ingredients.length)
            .map((ingIndex: number) => ({
              stepId: stepId,
              ingredientId: recipe.ingredients[ingIndex].id,
            }));

          if (stepIngredients.length > 0) {
            await prisma.stepIngredient.createMany({
              data: stepIngredients,
              skipDuplicates: true,
            });
          }
        }
      }
    }

    // Pobierz pełny przepis z relacjami
    const fullRecipe = await prisma.recipe.findUnique({
      where: { id: recipe.id },
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
        favorites: true,
      },
    });

    // Update daily quest progress
    await updateQuestProgress(session.user.id, 'RECIPES', 1);

    return NextResponse.json(fullRecipe, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

