import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const commentSchema = z.object({
  comment: z.string().min(1, "Komentarz nie może być pusty"),
});

/**
 * GET /api/recipes/[id]/comments
 * Get all comments for a recipe
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId } = await params;

    // Verify user has access to this recipe
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { householdId: true, isPublic: true },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    // Allow access if recipe is public OR user is in same household
    if (!recipe.isPublic && (!user?.householdId || user.householdId !== recipe.householdId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const comments = await prisma.recipeComment.findMany({
      where: { recipeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recipes/[id]/comments
 * Add a comment to a recipe
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId } = await params;
    const body = await request.json();

    const validation = commentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { comment } = validation.data;

    // Verify recipe exists and user has access
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { householdId: true, isPublic: true },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    // Allow commenting if recipe is public OR user is in same household
    if (!recipe.isPublic && (!user?.householdId || user.householdId !== recipe.householdId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const savedComment = await prisma.recipeComment.create({
      data: {
        userId: session.user.id,
        recipeId,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ comment: savedComment }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

