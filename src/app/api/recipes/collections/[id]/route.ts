import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * GET /api/recipes/collections/[id]
 *
 * Get a single collection with all recipes
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const collection = await prisma.recipeCollection.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { householdId: session.user.householdId, isShared: true },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        recipes: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                image: true,
                category: true,
                difficulty: true,
                totalTime: true,
                prepTime: true,
                cookTime: true,
                servings: true,
                tags: true,
              },
            },
            addedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            addedAt: "desc",
          },
        },
        _count: {
          select: {
            recipes: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    return NextResponse.json({ collection });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/recipes/collections/[id]
 *
 * Update collection details
 *
 * Body: {
 *   name?: string;
 *   description?: string;
 *   icon?: string;
 *   color?: string;
 *   isShared?: boolean;
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const existing = await prisma.recipeCollection.findFirst({
      where: {
        id,
        userId: session.user.id, // Only owner can edit
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found or unauthorized" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, description, icon, color, isShared } = body;

    const collection = await prisma.recipeCollection.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(isShared !== undefined && { isShared }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            recipes: true,
          },
        },
      },
    });

    return NextResponse.json({ collection });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/recipes/collections/[id]
 *
 * Delete a collection (only owner can delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const existing = await prisma.recipeCollection.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found or unauthorized" },
        { status: 404 }
      );
    }

    await prisma.recipeCollection.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Collection deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

