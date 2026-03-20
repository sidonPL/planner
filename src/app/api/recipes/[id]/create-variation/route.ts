import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";
import { CookingMethod, Difficulty, OvenMode } from "@prisma/client";

type VariationIngredientInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  optional?: boolean;
};

type VariationStepInput = {
  order?: number;
  content: string;
  duration?: number | null;
  temperature?: number | null;
  image?: string | null;
  tip?: string | null;
  isOptional?: boolean;
};

type VariationModifications = {
  name?: string;
  description?: string | null;
  instructions?: string | null;
  category?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  restTime?: number | null;
  totalTime?: number | null;
  servings?: number | null;
  difficulty?: Difficulty;
  image?: string | null;
  videoUrl?: string | null;
  tags?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
  cookingMethod?: CookingMethod | null;
  ovenTemp?: number | null;
  ovenMode?: OvenMode | null;
  allergens?: string[];
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  cuisine?: string | null;
  tips?: string | null;
  ingredients?: VariationIngredientInput[];
  steps?: VariationStepInput[];
};

type CreateVariationBody = {
  variationName?: string;
  description?: string;
  modifications: VariationModifications;
};

/**
 * POST /api/recipes/[id]/create-variation
 *
 * Create a variation (fork) of a recipe
 *
 * Body: {
 *   variationName?: string;
 *   description?: string;
 *   modifications: RecipeData; // The modified recipe data
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: parentRecipeId } = await params;
    const { variationName, description, modifications } =
      (await req.json()) as CreateVariationBody;

    // Get parent recipe
    const parentRecipe = await prisma.recipe.findUnique({
      where: { id: parentRecipeId },
      include: {
        ingredients: true,
        steps: true,
      },
    });

    if (!parentRecipe) {
      return NextResponse.json(
        { error: "Parent recipe not found" },
        { status: 404 }
      );
    }

    // Create the variant recipe
    const variantRecipe = await prisma.recipe.create({
      data: {
        // Use modifications if provided, otherwise copy from parent
        name: modifications.name || `${parentRecipe.name} (Variant)`,
        description: modifications.description || parentRecipe.description,
        instructions: modifications.instructions || parentRecipe.instructions,
        category: modifications.category || parentRecipe.category,
        prepTime: modifications.prepTime ?? parentRecipe.prepTime,
        cookTime: modifications.cookTime ?? parentRecipe.cookTime,
        restTime: modifications.restTime ?? parentRecipe.restTime,
        totalTime: modifications.totalTime ?? parentRecipe.totalTime,
        servings: modifications.servings || parentRecipe.servings,
        difficulty: modifications.difficulty || parentRecipe.difficulty,
        image: modifications.image || parentRecipe.image,
        videoUrl: modifications.videoUrl || parentRecipe.videoUrl,
        source: `Wariant: ${parentRecipe.name}`,
        tags: modifications.tags || parentRecipe.tags,
        isVegetarian: modifications.isVegetarian ?? parentRecipe.isVegetarian,
        isVegan: modifications.isVegan ?? parentRecipe.isVegan,
        isGlutenFree: modifications.isGlutenFree ?? parentRecipe.isGlutenFree,
        isDairyFree: modifications.isDairyFree ?? parentRecipe.isDairyFree,
        cookingMethod: modifications.cookingMethod || parentRecipe.cookingMethod,
        ovenTemp: modifications.ovenTemp ?? parentRecipe.ovenTemp,
        ovenMode: modifications.ovenMode || parentRecipe.ovenMode,
        allergens: modifications.allergens || parentRecipe.allergens,
        calories: modifications.calories ?? parentRecipe.calories,
        protein: modifications.protein ?? parentRecipe.protein,
        carbs: modifications.carbs ?? parentRecipe.carbs,
        fat: modifications.fat ?? parentRecipe.fat,
        fiber: modifications.fiber ?? parentRecipe.fiber,
        cuisine: modifications.cuisine || parentRecipe.cuisine,
        tips: modifications.tips || parentRecipe.tips,
        householdId: session.user.householdId,
        createdById: session.user.id,
        isPublic: false, // Variants are private by default
        // Copy ingredients
        ingredients: {
          create: (modifications.ingredients || parentRecipe.ingredients).map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            optional: ing.optional || false,
          })),
        },
        // Copy steps
        steps: {
          create: (modifications.steps || parentRecipe.steps).map((step, index: number) => ({
            order: step.order ?? index,
            content: step.content,
            duration: step.duration,
            temperature: step.temperature,
            image: step.image,
            tip: step.tip,
            isOptional: step.isOptional || false,
          })),
        },
      },
    });

    // Create the variation link
    const variation = await prisma.recipeVariation.create({
      data: {
        parentRecipeId,
        variantRecipeId: variantRecipe.id,
        variationName: variationName || null,
        description: description || null,
        createdById: session.user.id,
      },
      include: {
        variantRecipe: {
          include: {
            ingredients: true,
            steps: true,
          },
        },
        parentRecipe: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ variation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

