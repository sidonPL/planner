// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\cron\schedule-reminders\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { addMinutes, getDay, isWithinInterval } from "date-fns";

// Wysyła powiadomienia 15 minut przed rozpoczęciem zajęć z harmonogramu

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const currentDayOfWeek = getDay(now); // 0 = niedziela, 1 = poniedziałek, etc.

    // Pobierz aktywne harmonogramy na dzisiejszy dzień tygodnia
    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        dayOfWeek: { has: currentDayOfWeek },
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
              gte: new Date(now.toDateString()),
              lt: addMinutes(new Date(now.toDateString()), 24 * 60),
            },
          },
        },
      },
    });

    const notifications: { scheduleId: string; userId: string }[] = [];
    const reminderMinutes = 15; // 15 minut przed

    for (const schedule of schedules) {
      // Sprawdź czy jest wyjątek na dzisiaj
      if (schedule.exceptions.length > 0) {
        continue;
      }

      // Parsuj czas rozpoczęcia
      const [startHour, startMin] = schedule.startTime.split(":").map(Number);
      const scheduleStart = new Date(now);
      scheduleStart.setHours(startHour, startMin, 0, 0);

      // Oblicz czas przypomnienia (15 min przed)
      const reminderTime = addMinutes(scheduleStart, -reminderMinutes);

      // Sprawdź czy teraz jest okno przypomnienia (+/- 2 minuty)
      const windowStart = addMinutes(now, -2);
      const windowEnd = addMinutes(now, 2);

      if (isWithinInterval(reminderTime, { start: windowStart, end: windowEnd })) {
        // Sprawdź czy powiadomienie już nie zostało wysłane
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: schedule.userId,
            type: "EVENT_REMINDER",
            link: `/schedule`,
            createdAt: {
              gte: addMinutes(now, -10),
            },
            message: {
              contains: schedule.name,
            },
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
            message: `${schedule.name} rozpoczyna się o ${schedule.startTime}${schedule.location ? ` (${schedule.location})` : ""}`,
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

