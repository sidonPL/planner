// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\cron\task-reminders\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyTaskReminder } from "@/lib/notifications";
import { addMinutes, isBefore, isAfter, startOfDay } from "date-fns";

// Ten endpoint generuje przypomnienia o zadaniach na podstawie ustawionych reminderMinutes

export async function GET(request: NextRequest) {
  // Opcjonalnie: weryfikacja klucza API dla bezpieczeństwa
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const today = startOfDay(now);

    // Pobierz zadania z ustawionym terminem i przypomnieniami
    const tasksWithReminders = await prisma.task.findMany({
      where: {
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueDate: {
          gte: today, // tylko przyszłe lub dzisiejsze
        },
        reminderMinutes: {
          isEmpty: false,
        },
      },
      include: {
        assignee: {
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

    const notifications: { taskId: string; userId: string; minutesBefore: number }[] = [];

    for (const task of tasksWithReminders) {
      if (!task.assigneeId || !task.dueDate) continue;

      // Utwórz pełną datę z dueDate i dueTime
      const dueDateTime = new Date(task.dueDate);
      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(":").map(Number);
        dueDateTime.setHours(hours, minutes, 0, 0);
      }

      // Sprawdź każdy interwał przypomnienia
      for (const minutes of task.reminderMinutes) {
        const reminderTime = addMinutes(dueDateTime, -minutes);

        // Sprawdź czy czas przypomnienia jest w oknie czasowym (teraz +/- 5 minut)
        const windowStart = addMinutes(now, -5);
        const windowEnd = addMinutes(now, 5);

        if (isAfter(reminderTime, windowStart) && isBefore(reminderTime, windowEnd)) {
          // Sprawdź czy powiadomienie już nie zostało wysłane
          const existingNotification = await prisma.notification.findFirst({
            where: {
              link: `/tasks?id=${task.id}`,
              type: "TASK_REMINDER",
              userId: task.assigneeId,
              createdAt: {
                gte: addMinutes(now, -10), // w ciągu ostatnich 10 minut
              },
            },
          });

          if (!existingNotification) {
            await notifyTaskReminder(
              task.assigneeId,
              task.householdId,
              task.title,
              task.id,
              dueDateTime
            );

            notifications.push({
              taskId: task.id,
              userId: task.assigneeId,
              minutesBefore: minutes,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wysłano ${notifications.length} przypomnień o zadaniach`,
      notifications,
    });
  } catch (error) {
    console.error("Błąd podczas generowania przypomnień o zadaniach:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować przypomnień" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

