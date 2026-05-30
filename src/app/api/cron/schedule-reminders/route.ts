import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { addMinutes, isWithinInterval } from "date-fns";
import { doesScheduleOccurOnDate } from "@/lib/schedule-occurrence";
import { verifyCronAuth } from "@/lib/web-push";

import { combineLocalDateAndTime, getLocalDayBounds } from "@/lib/local-date";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getLocalDayBounds(now);

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
      const scheduleStart = combineLocalDateAndTime(
        now,
        `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`
      );

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
            type: "SCHEDULE_REMINDER",
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
            type: "SCHEDULE_REMINDER",
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

