import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ical from "ical-generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Znajdź użytkownika po tokenie
    const user = await prisma.user.findFirst({
      where: {
        calendarSyncToken: token
      },
      select: {
        id: true,
        name: true,
        email: true,
        householdId: true,
      },
    });

    if (!user || !user.householdId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Utwórz kalendarz
    const calendar = ical({
      name: `${user.name || "Mój"} Planner - Auto-Sync`,
      description: "Automatyczna synchronizacja z Planner",
      timezone: "Europe/Warsaw",
      url: `${process.env.NEXTAUTH_URL}/api/calendar/sync/${token}`,
      ttl: 3600,
    });

    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthsAhead = new Date(now);
    monthsAhead.setMonth(monthsAhead.getMonth() + 3);

    // Wydarzenia
    const events = await prisma.event.findMany({
      where: {
        householdId: user.householdId,
        startDate: { gte: monthAgo, lte: monthsAhead },
      },
      include: {
        user: { select: { name: true } },
      },
    });

    events.forEach((event) => {
      calendar.createEvent({
        id: `event-${event.id}@planner.app`,
        start: event.startDate,
        end: event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000),
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        sequence: 0,
        lastModified: event.updatedAt,
        created: event.createdAt,
      });
    });

    // Zadania
    const tasks = await prisma.task.findMany({
      where: {
        householdId: user.householdId,
        dueDate: { gte: monthAgo, lte: monthsAhead },
      },
    });

    tasks.forEach((task) => {
      if (!task.dueDate) return;

      calendar.createEvent({
        id: `task-${task.id}@planner.app`,
        start: task.dueDate,
        end: new Date(task.dueDate.getTime() + 30 * 60 * 1000),
        summary: `📋 ${task.title}`,
        description: task.description || undefined,
        sequence: 0,
        lastModified: task.updatedAt,
        created: task.createdAt,
      });
    });

    // Posiłki
    const meals = await prisma.meal.findMany({
      where: {
        householdId: user.householdId,
        date: { gte: monthAgo, lte: monthsAhead },
      },
      include: {
        recipe: { select: { name: true } },
      },
    });

    meals.forEach((meal) => {
      const mealTime = new Date(meal.date);

      if (meal.mealType === "BREAKFAST") {
        mealTime.setHours(8, 0, 0);
      } else if (meal.mealType === "LUNCH") {
        mealTime.setHours(13, 0, 0);
      } else if (meal.mealType === "DINNER") {
        mealTime.setHours(18, 0, 0);
      } else {
        mealTime.setHours(15, 0, 0);
      }

      calendar.createEvent({
        id: `meal-${meal.id}@planner.app`,
        start: mealTime,
        end: new Date(mealTime.getTime() + 60 * 60 * 1000),
        summary: `🍽️ ${meal.recipe?.name || meal.customName || "Posiłek"}`,
        sequence: 0,
        created: meal.createdAt,
      });
    });

    const icalString = calendar.toString();

    return new NextResponse(icalString, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Published-TTL": "PT1H",
      },
    });
  } catch (error) {
    console.error("Error syncing calendar:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

