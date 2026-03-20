import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RecipeUsageAggregate = {
  recipeId: string;
  recipeName: string;
  recipeImage: string | null;
  count: number;
  lastUsed: Date;
};

type IngredientUsageAggregate = {
  name: string;
  count: number;
  totalQuantity: number;
  unit: string | null;
};

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Pobierz historię użycia
    const usageHistory = await prisma.recipeUsageHistory.findMany({
      where: {
        householdId: session.user.householdId,
        timestamp: {
          gte: since,
        },
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        inventoryItem: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Statystyki najpopularniejszych przepisów
    const recipeStats = usageHistory.reduce((acc, usage) => {
      const key = usage.recipeId;
      if (!acc[key]) {
        acc[key] = {
          recipeId: usage.recipe.id,
          recipeName: usage.recipe.name,
          recipeImage: usage.recipe.image,
          count: 0,
          lastUsed: usage.timestamp,
        };
      }
      acc[key].count++;
      if (usage.timestamp > acc[key].lastUsed) {
        acc[key].lastUsed = usage.timestamp;
      }
      return acc;
    }, {} as Record<string, RecipeUsageAggregate>);

    const popularRecipes = Object.values(recipeStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Statystyki najpopularniejszych składników
    const ingredientStats = usageHistory.reduce((acc, usage) => {
      const key = usage.ingredientName.toLowerCase();
      if (!acc[key]) {
        acc[key] = {
          name: usage.ingredientName,
          count: 0,
          totalQuantity: 0,
          unit: usage.unit,
        };
      }
      acc[key].count++;
      acc[key].totalQuantity += usage.quantityUsed;
      return acc;
    }, {} as Record<string, IngredientUsageAggregate>);

    const popularIngredients = Object.values(ingredientStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Statystyki czasowe (użycie per dzień)
    const dailyUsage = usageHistory.reduce((acc, usage) => {
      const date = usage.timestamp.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      summary: {
        totalUsages: usageHistory.length,
        uniqueRecipes: Object.keys(recipeStats).length,
        uniqueIngredients: Object.keys(ingredientStats).length,
        period: `${days} dni`,
      },
      popularRecipes,
      popularIngredients,
      dailyUsage,
      recentHistory: usageHistory.slice(0, 20).map((h) => ({
        id: h.id,
        recipe: {
          id: h.recipe.id,
          name: h.recipe.name,
          image: h.recipe.image,
        },
        ingredient: h.ingredientName,
        quantity: h.quantityUsed,
        unit: h.unit,
        user: {
          id: h.user.id,
          name: h.user.name,
          avatar: h.user.avatar,
        },
        timestamp: h.timestamp,
      })),
    });
  } catch (error) {
    console.error("Error fetching usage statistics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

