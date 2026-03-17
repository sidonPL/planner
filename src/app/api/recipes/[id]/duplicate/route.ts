import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * Duplicate a recipe
 * POST /api/recipes/:id/duplicate
 *
 * Creates a copy of an existing recipe with all ingredients and steps
 * The duplicated recipe will have " (kopia)" appended to the name
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId } = await params;

    // Fetch original recipe with all relations
    const originalRecipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
        steps: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!originalRecipe) {
      return NextResponse.json(
        { error: "Przepis nie został znaleziony" },
        { status: 404 }
      );
    }

    // Check if user has access to this recipe
    if (
      originalRecipe.householdId !== session.user.householdId &&
      !originalRecipe.isPublic
    ) {
      return NextResponse.json(
        { error: "Brak dostępu do tego przepisu" },
        { status: 403 }
      );
    }

    // Create duplicate recipe
    const duplicatedRecipe = await prisma.recipe.create({
      data: {
        // Basic info
        name: `${originalRecipe.name} (kopia)`,
        description: originalRecipe.description,
        image: originalRecipe.image,
        category: originalRecipe.category,

        // Times
        prepTime: originalRecipe.prepTime,
        cookTime: originalRecipe.cookTime,
        restTime: originalRecipe.restTime,
        totalTime: originalRecipe.totalTime,

        // Details
        servings: originalRecipe.servings,
        difficulty: originalRecipe.difficulty,
        cookingMethod: originalRecipe.cookingMethod,
        ovenMode: originalRecipe.ovenMode,
        ovenTemp: originalRecipe.ovenTemp,

        // Metadata
        tags: originalRecipe.tags,
        cuisine: originalRecipe.cuisine,
        source: originalRecipe.source,
        tips: originalRecipe.tips,
        videoUrl: originalRecipe.videoUrl,

        // Nutrition
        calories: originalRecipe.calories,
        protein: originalRecipe.protein,
        carbs: originalRecipe.carbs,
        fat: originalRecipe.fat,
        fiber: originalRecipe.fiber,

        // Dietary
        allergens: originalRecipe.allergens,
        isVegetarian: originalRecipe.isVegetarian,
        isVegan: originalRecipe.isVegan,
        isGlutenFree: originalRecipe.isGlutenFree,
        isDairyFree: originalRecipe.isDairyFree,

        // Relations
        householdId: session.user.householdId!,
        createdById: session.user.id,
        isPublic: false, // Duplicate is always private initially

        // Copy ingredients
        ingredients: {
          create: originalRecipe.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            optional: ingredient.optional,
          })),
        },

        // Copy steps
        steps: {
          create: originalRecipe.steps.map((step) => ({
            content: step.content,
            order: step.order,
            duration: step.duration,
            image: step.image,
            temperature: step.temperature,
            tip: step.tip,
            isOptional: step.isOptional,
          })),
        },
      },
      include: {
        ingredients: true,
        steps: true,
      },
    });

    return NextResponse.json({
      message: "Przepis został zduplikowany",
      recipe: duplicatedRecipe,
    });
  } catch (error) {
    console.error("Error duplicating recipe:", error);
    return handleApiError(error);
  }
}

