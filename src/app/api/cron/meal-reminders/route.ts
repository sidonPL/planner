// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\cron\meal-reminders\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/web-push";

import { notifyMealReminder } from "@/lib/notifications";

import { startOfDay, endOfDay, addMinutes, isWithinInterval } from "date-fns";

// Godziny standardowych posiłków
const mealTimes: Record<string, string> = {
  BREAKFAST: "07:30",
  SECOND_BREAKFAST: "10:00",
  LUNCH: "13:00",
  SNACK: "16:00",
  DINNER: "19:00",
};

const mealTypeLabels: Record<string, string> = {
  BREAKFAST: "Śniadanie",
  SECOND_BREAKFAST: "II śniadanie",
  LUNCH: "Obiad",
  SNACK: "Podwieczorek",
  DINNER: "Kolacja",
};

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Pobierz posiłki na dziś
    const todayMeals = await prisma.meal.findMany({
      where: {
        date: {
          gte: today,
          lte: todayEnd,
        },
      },
      include: {
        recipe: {
          select: {
            name: true,
          },
        },
        household: {
          select: {
            id: true,
            members: {
              select: {
                id: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
          },
        },
      },
    });

    const notifications: { mealId: string; userId: string }[] = [];
    const reminderMinutes = 30; // 30 minut przed posiłkiem

    for (const meal of todayMeals) {
      // Określ czas posiłku
      const mealTimeStr = mealTimes[meal.mealType] || "12:00";
      const [mealHour, mealMin] = mealTimeStr.split(":").map(Number);
      
      const mealDateTime = new Date(today);
      mealDateTime.setHours(mealHour, mealMin, 0, 0);

      // Oblicz czas przypomnienia
      const reminderTime = addMinutes(mealDateTime, -reminderMinutes);

      // Sprawdź czy teraz jest okno przypomnienia (+/- 5 minut)
      const windowStart = addMinutes(now, -5);
      const windowEnd = addMinutes(now, 5);

      if (isWithinInterval(reminderTime, { start: windowStart, end: windowEnd })) {
        // Sprawdź czy powiadomienie już nie zostało wysłane
        const existingNotification = await prisma.notification.findFirst({
          where: {
            type: "MEAL_REMINDER",
            householdId: meal.householdId,
            createdAt: {
              gte: addMinutes(now, -10),
            },
            message: {
              contains: meal.recipe?.name || meal.customName || mealTypeLabels[meal.mealType],
            },
          },
        });

        if (!existingNotification) {
          const mealName = meal.recipe?.name || meal.customName || mealTypeLabels[meal.mealType];
          
          // Wyślij do przypisanej osoby lub wszystkich domowników
          const targetUsers = meal.assigneeId 
            ? [{ id: meal.assigneeId }]
            : meal.household.members;

          for (const user of targetUsers) {
            await notifyMealReminder(
              user.id,
              meal.householdId,
              mealName,
              mealTypeLabels[meal.mealType]
            );

            notifications.push({
              mealId: meal.id,
              userId: user.id,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wysłano ${notifications.length} przypomnień o posiłkach`,
      notifications,
    });
  } catch (error) {
    console.error("Błąd podczas generowania przypomnień o posiłkach:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować przypomnień" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

