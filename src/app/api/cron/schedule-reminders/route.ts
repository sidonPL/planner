// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\cron\schedule-reminders\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { addMinutes, endOfDay, isWithinInterval, startOfDay } from "date-fns";
import { doesScheduleOccurOnDate } from "@/lib/schedule-occurrence";

// Wysyła powiadomienia 15 minut przed rozpoczęciem zajęć z harmonogramu

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Pobierz aktywne harmonogramy i odfiltruj je przez reguły wystąpień.
    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        household: {
          select: {
            id: true,
          },
        },
        exceptions: {
          where: {
            date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        },
      },
    });

    const notifications: { scheduleId: string; userId: string }[] = [];
    const reminderMinutes = 15; // 15 minut przed

    for (const schedule of schedules) {
      if (!doesScheduleOccurOnDate(schedule, now)) {
        continue;
      }

      // Parsuj czas rozpoczęcia
      const [startHour, startMin] = schedule.startTime.split(":").map(Number);
      const scheduleStart = new Date(now);
      scheduleStart.setHours(startHour, startMin, 0, 0);

      // Oblicz czas przypomnienia (15 min przed)
      const reminderTime = addMinutes(scheduleStart, -reminderMinutes);

      // Sprawdź czy teraz jest okno przypomnienia (+/- 2 minuty)
      const reminderWindowStart = addMinutes(now, -2);
      const reminderWindowEnd = addMinutes(now, 2);

      if (isWithinInterval(reminderTime, { start: reminderWindowStart, end: reminderWindowEnd })) {
        const notificationMessage = `${schedule.name} rozpoczyna się o ${schedule.startTime}${schedule.location ? ` (${schedule.location})` : ""}`;

        // Sprawdź czy powiadomienie już nie zostało wysłane
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: schedule.userId,
            type: "EVENT_REMINDER",
            link: `/schedule`,
            createdAt: {
              gte: todayStart,
            },
            message: notificationMessage,
          },
        });

        if (!existingNotification) {
          const scheduleTypeLabels: Record<string, string> = {
            WORK: "Praca",
            SCHOOL: "Szkoła",
            UNIVERSITY: "Uczelnia",
            COURSE: "Kurs",
            OTHER: "Zajęcia",
          };

          await createNotification({
            userId: schedule.userId,
            householdId: schedule.householdId,
            title: `${scheduleTypeLabels[schedule.type] || "Zajęcia"} za 15 minut`,
            message: notificationMessage,
            type: "EVENT_REMINDER",
            link: "/schedule",
          });

          notifications.push({
            scheduleId: schedule.id,
            userId: schedule.userId,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wysłano ${notifications.length} przypomnień o zajęciach`,
      notifications,
    });
  } catch (error) {
    console.error("Błąd podczas generowania przypomnień o zajęciach:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować przypomnień" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

