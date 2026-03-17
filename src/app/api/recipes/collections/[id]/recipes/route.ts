import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * POST /api/recipes/collections/[id]/recipes
 *
 * Add a recipe to a collection
 *
 * Body: {
 *   recipeId: string;
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId } = await params;
    const { recipeId } = await req.json();

    if (!recipeId) {
      return NextResponse.json({ error: "Recipe ID required" }, { status: 400 });
    }

    // Verify access to collection
    const collection = await prisma.recipeCollection.findFirst({
      where: {
        id: collectionId,
        OR: [
          { userId: session.user.id },
          { householdId: session.user.householdId, isShared: true },
        ],
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Verify recipe exists and user has access
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        householdId: session.user.householdId,
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Check if already in collection
    const existing = await prisma.collectionRecipe.findUnique({
      where: {
        collectionId_recipeId: {
          collectionId,
          recipeId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Recipe already in collection" },
        { status: 400 }
      );
    }

    // Add to collection
    const collectionRecipe = await prisma.collectionRecipe.create({
      data: {
        collectionId,
        recipeId,
        addedById: session.user.id!,
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            image: true,
            category: true,
          },
        },
      },
    });

    // Update collection's updatedAt
    await prisma.recipeCollection.update({
      where: { id: collectionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: "Recipe added to collection",
      collectionRecipe,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/recipes/collections/[id]/recipes/[recipeId]
 *
 * Remove a recipe from a collection
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

    const { id: collectionId } = await params;
    const { searchParams } = new URL(req.url);
    const recipeId = searchParams.get("recipeId");

    if (!recipeId) {
      return NextResponse.json({ error: "Recipe ID required" }, { status: 400 });
    }

    // Verify access to collection
    const collection = await prisma.recipeCollection.findFirst({
      where: {
        id: collectionId,
        OR: [
          { userId: session.user.id },
          { householdId: session.user.householdId, isShared: true },
        ],
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Remove from collection
    await prisma.collectionRecipe.deleteMany({
      where: {
        collectionId,
        recipeId,
      },
    });

    // Update collection's updatedAt
    await prisma.recipeCollection.update({
      where: { id: collectionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message: "Recipe removed from collection" });
  } catch (error) {
    return handleApiError(error);
  }
}

