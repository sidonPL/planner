import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * GET /api/recipes/autocomplete
 *
 * Query params:
 * - q: search query (required)
 * - limit: max results (optional, default: 10)
 *
 * Returns autocomplete suggestions for recipe search
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        suggestions: [],
        popular: [],
        recent: []
      });
    }

    const searchTerm = query.trim().toLowerCase();

    // 1. Recipe name suggestions (prefix match)
    const nameSuggestions = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        category: true,
        image: true,
        _count: {
          select: {
            favorites: true,
          },
        },
      },
      orderBy: [
        { favorites: { _count: 'desc' } }, // Popular first
        { name: 'asc' },
      ],
      take: limit,
    });

    // 2. Category suggestions
    const categorySuggestions = await prisma.recipe.groupBy({
      by: ['category'],
      where: {
        householdId: session.user.householdId,
        category: {
          not: null,
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
      take: 3,
    });

    // 3. Tag suggestions
    const recipesWithMatchingTags = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
        tags: {
          hasSome: [searchTerm],
        },
      },
      select: {
        tags: true,
      },
      take: 50,
    });

    // Extract unique matching tags
    const allTags = recipesWithMatchingTags.flatMap(r => r.tags);
    const matchingTags = [...new Set(allTags)]
      .filter(tag => tag.toLowerCase().includes(searchTerm))
      .slice(0, 5);

    // 4. Ingredient suggestions (bonus!)
    const ingredientSuggestions = await prisma.recipeIngredient.findMany({
      where: {
        recipe: {
          householdId: session.user.householdId,
        },
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      select: {
        name: true,
        recipe: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      distinct: ['name'],
      take: 5,
    });

    // 5. Popular searches (from usage history)
    const popularRecipes = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        name: true,
        _count: {
          select: {
            usageHistory: true,
          },
        },
      },
      orderBy: {
        usageHistory: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    // Format suggestions
    const suggestions = [
      // Recipe names (most relevant)
      ...nameSuggestions.map(r => ({
        type: 'recipe' as const,
        id: r.id,
        text: r.name,
        category: r.category,
        image: r.image,
        count: r._count.favorites,
        highlight: highlightMatch(r.name, searchTerm),
      })),

      // Categories
      ...categorySuggestions.map(c => ({
        type: 'category' as const,
        text: c.category!,
        count: c._count.category,
        highlight: highlightMatch(c.category!, searchTerm),
      })),

      // Tags
      ...matchingTags.map(tag => ({
        type: 'tag' as const,
        text: tag,
        highlight: highlightMatch(tag, searchTerm),
      })),

      // Ingredients
      ...ingredientSuggestions.slice(0, 3).map(i => ({
        type: 'ingredient' as const,
        text: i.name,
        recipeCount: 1,
        highlight: highlightMatch(i.name, searchTerm),
      })),
    ].slice(0, limit);

    // Popular searches (always shown)
    const popular = popularRecipes
      .filter(r => r._count.usageHistory > 0)
      .map(r => ({
        text: r.name,
        count: r._count.usageHistory,
      }));

    return NextResponse.json({
      suggestions,
      popular,
      query: searchTerm,
    });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return handleApiError(error);
  }
}

/**
 * Helper to highlight matched text
 */
function highlightMatch(text: string, query: string): { pre: string; match: string; post: string } | null {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return null;
  }

  return {
    pre: text.slice(0, index),
    match: text.slice(index, index + query.length),
    post: text.slice(index + query.length),
  };
}

