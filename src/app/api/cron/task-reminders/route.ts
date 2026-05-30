import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyTaskReminder } from "@/lib/notifications";
import { addMinutes, isWithinInterval } from "date-fns";
import { combineLocalDateAndTime, getLocalDayDate } from "@/lib/local-date";
import { verifyCronAuth } from "@/lib/web-push";

import { formatReminderLabel } from "@/lib/reminder-options";

const REMINDER_WINDOW_MINUTES = 5;
const DEDUPE_WINDOW_MINUTES = 15;

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const today = getLocalDayDate(now);

    const tasksWithReminders = await prisma.task.findMany({
      where: {
        status: { in: ["TODO", "IN_PROGRESS"] },
        reminderMinutes: {
          isEmpty: false,
        },
        OR: [
          { dueDate: { gte: today } },
          {
            isRecurring: true,
            dueTime: { not: null },
            dueDate: { gte: today },
          },
        ],
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const notifications: {
      taskId: string;
      userId: string;
      minutesBefore: number;
    }[] = [];

    for (const task of tasksWithReminders) {
      const targetUserId = task.assigneeId || task.creatorId;
      if (!targetUserId) continue;

      let dueDateTime: Date | null = null;

      if (task.dueDate && task.dueTime) {
        dueDateTime = combineLocalDateAndTime(task.dueDate, task.dueTime);
      } else if (task.dueDate) {
        dueDateTime = getLocalDayDate(task.dueDate);
      } else if (task.isRecurring && task.dueTime) {
        dueDateTime = combineLocalDateAndTime(today, task.dueTime);
      }

      if (!dueDateTime) continue;

      for (const minutesBefore of task.reminderMinutes) {
        const reminderTime = addMinutes(dueDateTime, -minutesBefore);
        const windowStart = addMinutes(now, -REMINDER_WINDOW_MINUTES);
        const windowEnd = addMinutes(now, REMINDER_WINDOW_MINUTES);

        if (
          !isWithinInterval(reminderTime, {
            start: windowStart,
            end: windowEnd,
          })
        ) {
          continue;
        }

        const dedupeTitle = `Przypomnienie: ${task.title}`;
        const reminderLabel = formatReminderLabel(minutesBefore);
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: targetUserId,
            type: "TASK_REMINDER",
            title: dedupeTitle,
            message: {
              startsWith: reminderLabel,
            },
            createdAt: {
              gte: addMinutes(now, -DEDUPE_WINDOW_MINUTES),
            },
          },
        });

        if (existingNotification) {
          continue;
        }

        await notifyTaskReminder(
          targetUserId,
          task.householdId,
          task.title,
          task.id,
          dueDateTime,
          minutesBefore
        );

        notifications.push({
          taskId: task.id,
          userId: targetUserId,
          minutesBefore,
        });
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
