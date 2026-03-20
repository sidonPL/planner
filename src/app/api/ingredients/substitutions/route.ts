import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";
import { Prisma } from "@prisma/client";

/**
 * GET /api/ingredients/substitutions?ingredient=mleko
 *
 * Get substitution suggestions for an ingredient
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ingredient = searchParams.get("ingredient");
    const category = searchParams.get("category"); // vegan, gluten-free, etc.

    if (!ingredient) {
      return NextResponse.json(
        { error: "Ingredient parameter is required" },
        { status: 400 }
      );
    }

    // Search for substitutions
    const where: Prisma.IngredientSubstitutionWhereInput = {
      OR: [
        { originalName: { contains: ingredient, mode: "insensitive" } },
        { originalName: { equals: ingredient, mode: "insensitive" } },
      ],
    };

    // Filter by category if provided
    if (category) {
      where.category = category;
    }

    // Get both global and household-specific substitutions
    const substitutions = await prisma.ingredientSubstitution.findMany({
      where: {
        ...where,
        OR: [
          { householdId: null }, // Global
          { householdId: session.user.householdId }, // Household-specific
        ],
      },
      orderBy: [
        { confidence: "desc" },
        { createdAt: "desc" },
      ],
      take: 10,
    });

    return NextResponse.json({ substitutions });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/ingredients/substitutions
 *
 * Create a new substitution (household-specific)
 *
 * Body: {
 *   originalName: string;
 *   substituteName: string;
 *   ratio?: number;
 *   notes?: string;
 *   category?: string;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { originalName, substituteName, ratio, notes, category } = await req.json();

    if (!originalName || !substituteName) {
      return NextResponse.json(
        { error: "originalName and substituteName are required" },
        { status: 400 }
      );
    }

    const substitution = await prisma.ingredientSubstitution.create({
      data: {
        originalName: originalName.trim(),
        substituteName: substituteName.trim(),
        ratio: ratio || 1.0,
        notes: notes?.trim() || null,
        category: category || null,
        confidence: 1.0, // User-created = high confidence
        isAIGenerated: false,
        householdId: session.user.householdId,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ substitution }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

