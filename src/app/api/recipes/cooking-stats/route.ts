import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Pobierz wszystkie oceny użytkownika (cookedAt = data gotowania)
    const cookingHistory = await prisma.recipeRating.findMany({
      where: { userId },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            image: true,
            category: true,
            prepTime: true,
            cookTime: true,
            difficulty: true,
          },
        },
      },
      orderBy: { cookedAt: "desc" },
    });

    // Oblicz statystyki
    const totalRecipesCooked = cookingHistory.length;
    const uniqueRecipesCooked = new Set(cookingHistory.map((h) => h.recipeId)).size;

    // Najczęściej gotowane przepisy
    const recipeFrequency = cookingHistory.reduce((acc, item) => {
      acc[item.recipeId] = (acc[item.recipeId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCookedRecipes = Object.entries(recipeFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([recipeId, count]) => {
        const recipe = cookingHistory.find((h) => h.recipeId === recipeId)?.recipe;
        return { recipe, count };
      });

    // Ulubione kategorie
    const categoryFrequency = cookingHistory.reduce((acc, item) => {
      const category = item.recipe.category || "OTHER";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteCategories = Object.entries(categoryFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => ({ category, count }));

    // Oblicz cooking streak (dni z rzędu)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    const sortedDates = cookingHistory
      .map((h) => new Date(h.cookedAt))
      .sort((a, b) => b.getTime() - a.getTime());

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const dateStr = currentDate.toDateString();

      if (lastDate) {
        const lastDateStr = lastDate.toDateString();
        const daysDiff = Math.floor(
          (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Kolejny dzień
          tempStreak++;
        } else if (daysDiff === 0) {
          // Ten sam dzień - kontynuuj
        } else {
          // Przerwa w streak
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }

      lastDate = currentDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // Sprawdź obecny streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mostRecentDate = sortedDates[0];
    if (mostRecentDate) {
      mostRecentDate.setHours(0, 0, 0, 0);
      const daysSinceLastCook = Math.floor(
        (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastCook === 0 || daysSinceLastCook === 1) {
        currentStreak = tempStreak;
      }
    }

    // Łączny czas gotowania (w minutach)
    const totalCookingTime = cookingHistory.reduce((sum, item) => {
      return sum + (item.recipe.prepTime || 0) + (item.recipe.cookTime || 0);
    }, 0);

    // Top ocenione przepisy
    const topRatedRecipes = [...cookingHistory]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map((item) => ({
        recipe: item.recipe,
        rating: item.rating,
        cookedAt: item.cookedAt,
      }));

    // Ostatnio gotowane
    const recentlyCooked = cookingHistory.slice(0, 10).map((item) => ({
      recipe: item.recipe,
      rating: item.rating,
      cookedAt: item.cookedAt,
    }));

    // Pobierz osiągnięcia użytkownika
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: "desc" },
    });

    // Pobierz postęp do osiągnięć
    const achievementProgress = await prisma.badgeProgress.findMany({
      where: {
        userId,
        badge: {
          condition: {
            contains: "RECIPES",
          },
        },
      },
      include: {
        badge: true,
      },
    });

    // Pobierz dane użytkownika (xp, level, streak)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    return NextResponse.json({
      stats: {
        totalRecipesCooked,
        uniqueRecipesCooked,
        currentStreak,
        longestStreak,
        totalCookingTime,
        totalCookingHours: Math.floor(totalCookingTime / 60),
        favoriteCategory: favoriteCategories[0]?.category || null,
        xp: user?.xp || 0,
        level: user?.level || 1,
      },
      mostCookedRecipes,
      favoriteCategories,
      topRatedRecipes,
      recentlyCooked,
      cookingHistory: recentlyCooked,
      achievements: userAchievements,
      achievementProgress,
    });
  } catch (error) {
    console.error("Error fetching cooking stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch cooking stats" },
      { status: 500 }
    );
  }
}

