import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ical from "ical-generator";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeEvents = searchParams.get("events") !== "false";
    const includeTasks = searchParams.get("tasks") !== "false";
    const includeMeals = searchParams.get("meals") !== "false";

    // Utwórz kalendarz
    const calendar = ical({
      name: `${session.user.name || "Mój"} Planner - Kalendarz`,
      description: "Eksport kalendarza z aplikacji Planner",
      timezone: "Europe/Warsaw",
      url: `${process.env.NEXTAUTH_URL}/calendar/export`,
      ttl: 3600, // Refresh co godzinę
    });

    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAhead = new Date(now);
    monthAhead.setMonth(monthAhead.getMonth() + 3);

    // Wydarzenia
    if (includeEvents) {
      const events = await prisma.event.findMany({
        where: {
          householdId: session.user.householdId,
          startDate: {
            gte: monthAgo,
            lte: monthAhead,
          },
        },
        include: {
          user: {
            select: { name: true },
          },
        },
      });

      events.forEach((event) => {
        calendar.createEvent({
          start: event.startDate,
          end: event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000), // +1h jeśli brak endDate
          summary: event.title,
          description: event.description || undefined,
          location: event.location || undefined,
          url: `${process.env.NEXTAUTH_URL}/calendar?event=${event.id}`,
          ...(event.user?.name && session.user.email && {
            organizer: {
              name: event.user.name,
              email: session.user.email,
            },
          }),
        });
      });
    }

    // Zadania
    if (includeTasks) {
      const tasks = await prisma.task.findMany({
        where: {
          householdId: session.user.householdId,
          dueDate: {
            gte: monthAgo,
            lte: monthAhead,
          },
        },
        include: {
          assignee: {
            select: { name: true },
          },
        },
      });

      tasks.forEach((task) => {
        if (!task.dueDate) return;

        calendar.createEvent({
          start: task.dueDate,
          end: new Date(task.dueDate.getTime() + 30 * 60 * 1000), // +30min
          summary: `📋 ${task.title}`,
          description: task.description || undefined,
          url: `${process.env.NEXTAUTH_URL}/tasks/${task.id}`,
          priority: task.priority === "HIGH" ? 1 : task.priority === "MEDIUM" ? 5 : 9,
        });
      });
    }

    // Posiłki
    if (includeMeals) {
      const meals = await prisma.meal.findMany({
        where: {
          householdId: session.user.householdId,
          date: {
            gte: monthAgo,
            lte: monthAhead,
          },
        },
        include: {
          recipe: {
            select: { name: true },
          },
        },
      });

      meals.forEach((meal) => {
        const mealTime = new Date(meal.date);

        // Ustaw czas na podstawie typu posiłku
        if (meal.mealType === "BREAKFAST") {
          mealTime.setHours(8, 0, 0);
        } else if (meal.mealType === "LUNCH") {
          mealTime.setHours(13, 0, 0);
        } else if (meal.mealType === "DINNER") {
          mealTime.setHours(18, 0, 0);
        } else {
          mealTime.setHours(15, 0, 0); // SNACK
        }

        const endTime = new Date(mealTime.getTime() + 60 * 60 * 1000); // +1h

        calendar.createEvent({
          start: mealTime,
          end: endTime,
          summary: `🍽️ ${meal.recipe?.name || meal.customName || "Posiłek"}`,
          url: `${process.env.NEXTAUTH_URL}/meals/${meal.id}`,
        });
      });
    }

    // Generuj iCal
    const icalString = calendar.toString();

    return new NextResponse(icalString, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="planner-calendar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error exporting calendar:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

