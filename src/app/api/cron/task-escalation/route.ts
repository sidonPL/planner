import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/web-push";

import { createNotification } from "@/lib/notifications";

import { subDays, startOfDay, differenceInDays } from "date-fns";

// Ten endpoint eskaluje przypomnienia dla przeterminowanych zadań

export async function GET(request: NextRequest) {
  // Weryfikacja klucza API dla bezpieczeństwa
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const today = startOfDay(now);

    // Pobierz przeterminowane zadania (max 7 dni wstecz)
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueDate: {
          lt: today,
          gte: subDays(today, 7), // max 7 dni przeterminowane
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
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
      },
    });

    const escalations: { taskId: string; userId: string; daysOverdue: number }[] = [];

    for (const task of overdueTasks) {
      if (!task.dueDate) continue;

      const daysOverdue = differenceInDays(today, new Date(task.dueDate));
      const usersToNotify: string[] = [];

      // Zawsze powiadamiaj przypisaną osobę
      if (task.assigneeId) {
        usersToNotify.push(task.assigneeId);
      }

      // Po 2 dniach powiadom również twórcę zadania (jeśli inny)
      if (daysOverdue >= 2 && task.creatorId && task.creatorId !== task.assigneeId) {
        usersToNotify.push(task.creatorId);
      }

      // Określ częstotliwość eskalacji na podstawie dni przeterminowania
      // Dzień 1: raz dziennie
      // Dzień 2-3: raz dziennie
      // Dzień 4+: co 12 godzin (sprawdzamy co godzinę, więc 2 razy dziennie)
      const shouldEscalateNow = daysOverdue >= 1;

      if (!shouldEscalateNow) continue;

      for (const userId of usersToNotify) {
        // Sprawdź czy ostatnia eskalacja była wysłana odpowiednio dawno
        const minHoursSinceLastNotification = daysOverdue >= 4 ? 12 : 24;

        const recentEscalation = await prisma.notification.findFirst({
          where: {
            userId,
            type: "TASK_REMINDER",
            link: `/tasks?id=${task.id}`,
            title: { contains: "przeterminowane" },
            createdAt: {
              gte: new Date(Date.now() - minHoursSinceLastNotification * 60 * 60 * 1000),
            },
          },
        });

        if (!recentEscalation) {
          // Utwórz eskalowane powiadomienie
          const urgencyLevel = daysOverdue >= 4 ? "🔴🔴" : daysOverdue >= 2 ? "🔴" : "⚠️";

          await createNotification({
            userId,
            householdId: task.householdId,
            type: "TASK_REMINDER",
            title: `${urgencyLevel} Zadanie przeterminowane!`,
            message: `"${task.title}" jest przeterminowane o ${daysOverdue} ${daysOverdue === 1 ? "dzień" : daysOverdue < 5 ? "dni" : "dni"}. Wykonaj je jak najszybciej!`,
            link: `/tasks?id=${task.id}`,
          });

          escalations.push({
            taskId: task.id,
            userId,
            daysOverdue,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wysłano ${escalations.length} eskalacji dla przeterminowanych zadań`,
      escalations,
      overdueTasks: overdueTasks.length,
    });
  } catch (error) {
    console.error("Błąd podczas eskalacji przypomnień:", error);
    return NextResponse.json(
      { error: "Nie udało się przeprowadzić eskalacji" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

