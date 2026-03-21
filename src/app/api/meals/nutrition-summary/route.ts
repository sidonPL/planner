import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";
import { startOfWeek, endOfWeek, addDays } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * GET /api/meals/nutrition-summary
 *
 * Query params:
 * - weekStart: ISO date string (optional, default: current week)
 *
 * Returns nutrition summary for all meals in the specified week
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get("weekStart");

    const weekStart = weekStartParam
      ? startOfWeek(new Date(weekStartParam), { locale: pl })
      : startOfWeek(new Date(), { locale: pl });

    const weekEnd = endOfWeek(weekStart, { locale: pl });

    // Pobierz wszystkie posiłki z tego tygodnia z przepisami
    const meals = await prisma.meal.findMany({
      where: {
        householdId: session.user.householdId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            servings: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            fiber: true,
          },
        },
        simpleDish: {
          select: {
            id: true,
            name: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            fiber: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Oblicz totals dla całego tygodnia
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let mealsWithNutrition = 0;

    // Breakdown per day
    const dailyBreakdown: {
      date: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      mealsCount: number;
    }[] = [];

    // Initialize 7 days
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      dailyBreakdown.push({
        date: date.toISOString(),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        mealsCount: 0,
      });
    }

    // Aggregate nutrition
    meals.forEach(meal => {
      const source = meal.recipe ?? meal.simpleDish;
      if (source) {
        const calories = source.calories || 0;
        const protein = source.protein || 0;
        const carbs = source.carbs || 0;
        const fat = source.fat || 0;
        const fiber = source.fiber || 0;

        totalCalories += calories;
        totalProtein += protein;
        totalCarbs += carbs;
        totalFat += fat;
        totalFiber += fiber;

        if (calories > 0) {
          mealsWithNutrition++;
        }

        // Add to daily breakdown
        const mealDate = new Date(meal.date);
        const dayIndex = Math.floor((mealDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));

        if (dayIndex >= 0 && dayIndex < 7) {
          dailyBreakdown[dayIndex].calories += calories;
          dailyBreakdown[dayIndex].protein += protein;
          dailyBreakdown[dayIndex].carbs += carbs;
          dailyBreakdown[dayIndex].fat += fat;
          dailyBreakdown[dayIndex].fiber += fiber;
          dailyBreakdown[dayIndex].mealsCount++;
        }
      }
    });

    // Oblicz średnie dzienne
    const dailyAverage = {
      calories: Math.round(totalCalories / 7),
      protein: Math.round(totalProtein / 7),
      carbs: Math.round(totalCarbs / 7),
      fat: Math.round(totalFat / 7),
      fiber: Math.round(totalFiber / 7),
    };

    // Recommended daily values (przykładowe, można customizować per user)
    const recommendedDaily = {
      calories: 2000,  // kcal
      protein: 50,     // g
      carbs: 300,      // g
      fat: 70,         // g
      fiber: 25,       // g
    };

    // Oblicz progress (% of recommended)
    const progress = {
      calories: Math.round((dailyAverage.calories / recommendedDaily.calories) * 100),
      protein: Math.round((dailyAverage.protein / recommendedDaily.protein) * 100),
      carbs: Math.round((dailyAverage.carbs / recommendedDaily.carbs) * 100),
      fat: Math.round((dailyAverage.fat / recommendedDaily.fat) * 100),
      fiber: Math.round((dailyAverage.fiber / recommendedDaily.fiber) * 100),
    };

    // Insights & recommendations
    const insights: string[] = [];

    if (progress.protein < 80) {
      insights.push("Rozważ dodanie więcej produktów wysokobiałkowych (kurczak, ryba, jajka, rośliny strączkowe)");
    }
    if (progress.fiber < 80) {
      insights.push("Dodaj więcej warzyw i pełnoziarnistych produktów dla większej ilości błonnika");
    }
    if (progress.calories > 120) {
      insights.push("Średnia kaloryjna przekracza zalecenia - rozważ lżejsze opcje lub mniejsze porcje");
    }
    if (mealsWithNutrition === 0) {
      insights.push("Brak danych odżywczych. Dodaj wartości odżywcze do przepisów lub gotowych dań!");
    }

    return NextResponse.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totals: {
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat),
        fiber: Math.round(totalFiber),
      },
      dailyAverage,
      recommendedDaily,
      progress,
      dailyBreakdown,
      mealsCount: meals.length,
      mealsWithNutrition,
      insights,
    });
  } catch (error) {
    console.error("Error fetching nutrition summary:", error);
    return handleApiError(error);
  }
}

