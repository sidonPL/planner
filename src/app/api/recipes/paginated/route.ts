import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

const RECIPES_PER_PAGE = 24;

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || String(RECIPES_PER_PAGE));
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");
    const quickFilter = searchParams.get("quickFilter");

    // Build where clause
    const where: any = {
      householdId: session.user.householdId,
    };

    // Search by name, description, tags
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } },
        { cuisine: { contains: search, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (category && category !== "all") {
      where.category = category;
    }

    // Difficulty filter
    if (difficulty && difficulty !== "all") {
      where.difficulty = difficulty;
    }

    // Quick filters
    if (quickFilter) {
      switch (quickFilter) {
        case "quick":
          // Recipes under 30 minutes total time
          where.OR = [
            { totalTime: { lte: 30 } },
            {
              AND: [
                { totalTime: null },
                {
                  OR: [
                    {
                      AND: [
                        { prepTime: { not: null } },
                        { cookTime: { not: null } },
                        // We need raw SQL for this complex calculation
                      ],
                    },
                  ],
                },
              ],
            },
          ];
          break;
        case "vegetarian":
          where.isVegetarian = true;
          break;
        case "vegan":
          where.isVegan = true;
          break;
        case "favorites":
          where.favorites = {
            some: {
              userId: session.user.id,
            },
          };
          break;
      }
    }

    // Count total for pagination
    const total = await prisma.recipe.count({ where });

    // Fetch paginated recipes
    const recipes = await prisma.recipe.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        ingredients: {
          include: {
            stepIngredients: true,
          },
        },
        steps: {
          include: {
            stepIngredients: {
              include: {
                ingredient: true,
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        favorites: {
          where: {
            userId: session.user.id,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      recipes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

