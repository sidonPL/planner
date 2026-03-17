import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkAndAwardCookingAchievements } from "@/lib/achievements";

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  cookedAt: z.string().optional(),
});

/**
 * GET /api/recipes/[id]/rating
 * Get user's rating and recipe statistics
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

    // Get user's rating
    const userRating = await prisma.recipeRating.findUnique({
      where: {
        userId_recipeId: {
          userId: session.user.id,
          recipeId,
        },
      },
    });

    // Get average rating and count
    const stats = await prisma.recipeRating.aggregate({
      where: { recipeId },
      _avg: { rating: true },
      _count: true,
    });

    return NextResponse.json({
      userRating: userRating ? {
        rating: userRating.rating,
        comment: userRating.comment,
        cookedAt: userRating.cookedAt,
      } : null,
      averageRating: stats._avg.rating || 0,
      totalRatings: stats._count,
    });
  } catch (error) {
    console.error("Error fetching rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recipes/[id]/rating
 * Create or update rating
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

    const validation = ratingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { rating, comment, cookedAt } = validation.data;

    // Verify recipe exists and user has access
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { householdId: true },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId || user.householdId !== recipe.householdId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Upsert rating
    const savedRating = await prisma.recipeRating.upsert({
      where: {
        userId_recipeId: {
          userId: session.user.id,
          recipeId,
        },
      },
      create: {
        userId: session.user.id,
        recipeId,
        rating,
        comment: comment || null,
        cookedAt: cookedAt ? new Date(cookedAt) : new Date(),
      },
      update: {
        rating,
        comment: comment || null,
        cookedAt: cookedAt ? new Date(cookedAt) : new Date(),
        updatedAt: new Date(),
      },
    });

    // Get updated statistics
    const stats = await prisma.recipeRating.aggregate({
      where: { recipeId },
      _avg: { rating: true },
      _count: true,
    });

    // Check and award achievements
    const achievementResult = await checkAndAwardCookingAchievements(session.user.id);

    return NextResponse.json({
      rating: savedRating,
      averageRating: stats._avg.rating || 0,
      totalRatings: stats._count,
      newAchievements: achievementResult.awarded,
    });
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipes/[id]/rating
 * Delete user's rating
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId } = await params;

    await prisma.recipeRating.delete({
      where: {
        userId_recipeId: {
          userId: session.user.id,
          recipeId,
        },
      },
    });

    // Get updated statistics
    const stats = await prisma.recipeRating.aggregate({
      where: { recipeId },
      _avg: { rating: true },
      _count: true,
    });

    return NextResponse.json({
      averageRating: stats._avg.rating || 0,
      totalRatings: stats._count,
    });
  } catch (error) {
    console.error("Error deleting rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

