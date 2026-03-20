import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

type CookingHistoryRecipe = {
  id: string;
  name: string;
  category: string | null;
};

/**
 * GET /api/recipes/cooking-history
 *
 * Get cooking history and analytics for current user
 *
 * Query params:
 * - period: "week" | "month" | "year" | "all" (default: "month")
 * - limit: number (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";
    const limit = parseInt(searchParams.get("limit") || "10");

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get cooking history from RecipeRating (has cookedAt field)
    const cookingHistory = await prisma.recipeRating.findMany({
      where: {
        userId: session.user.id,
        cookedAt: {
          gte: startDate,
        },
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            image: true,
            category: true,
            difficulty: true,
            totalTime: true,
          },
        },
      },
      orderBy: {
        cookedAt: "desc",
      },
      take: limit,
    });

    // Get all-time stats
    const allTimeHistory = await prisma.recipeRating.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    // Calculate analytics
    const totalCooked = allTimeHistory.length;

    // Most cooked recipes
    const recipeCount: Record<string, { recipe: CookingHistoryRecipe; count: number }> = {};
    allTimeHistory.forEach((rating) => {
      const recipeId = rating.recipe.id;
      if (!recipeCount[recipeId]) {
        recipeCount[recipeId] = {
          recipe: rating.recipe,
          count: 0,
        };
      }
      recipeCount[recipeId].count++;
    });

    const mostCooked = Object.values(recipeCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        recipe: item.recipe,
        timesCooked: item.count,
      }));

    // Category distribution
    const categoryCount: Record<string, number> = {};
    allTimeHistory.forEach((rating) => {
      const category = rating.recipe.category || "other";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // Recent cooking frequency (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentHistory = allTimeHistory.filter(
      h => new Date(h.cookedAt) >= thirtyDaysAgo
    );

    const cookingFrequency = recentHistory.length / 30; // avg per day

    // Average rating
    const totalRating = allTimeHistory.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalCooked > 0 ? totalRating / totalCooked : 0;

    return NextResponse.json({
      history: cookingHistory.map(h => ({
        id: h.id,
        recipe: h.recipe,
        cookedAt: h.cookedAt,
        rating: h.rating,
        comment: h.comment,
      })),
      analytics: {
        totalCooked,
        mostCooked,
        categoryDistribution: categoryCount,
        cookingFrequency: parseFloat(cookingFrequency.toFixed(2)),
        averageRating: parseFloat(averageRating.toFixed(1)),
        period,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

