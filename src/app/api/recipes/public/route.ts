import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * GET /api/recipes/public
 *
 * Get all public recipes (from all households)
 *
 * Query params:
 * - search: string
 * - category: string
 * - limit: number (default 20)
 * - offset: number (default 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {
      isPublic: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    if (category && category !== "all") {
      where.category = category;
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          household: {
            select: {
              id: true,
              name: true,
            },
          },
          ratings: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              comments: true,
              favorites: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.recipe.count({ where }),
    ]);

    // Calculate average ratings
    const recipesWithStats = recipes.map(recipe => ({
      ...recipe,
      avgRating: recipe.ratings.length > 0
        ? recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length
        : null,
      ratings: undefined, // Remove full ratings array
    }));

    return NextResponse.json({
      recipes: recipesWithStats,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

