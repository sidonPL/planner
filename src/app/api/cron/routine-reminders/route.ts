import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMinutes, isWithinInterval } from "date-fns";
import { createNotification } from "@/lib/notifications";
import { verifyCronAuth } from "@/lib/web-push";

import { combineLocalDateAndTime, getLocalDayBounds, getLocalDayDate } from "@/lib/local-date";
import { isRoutineScheduledForDay } from "@/lib/routine-occurrence";

const REMINDER_WINDOW_MINUTES = 5;

export async function GET(req: Request) {
  try {
    if (!verifyCronAuth(req.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = getLocalDayDate(now);
    const { start: windowStart, end: windowEnd } = {
      start: addMinutes(now, -REMINDER_WINDOW_MINUTES),
      end: addMinutes(now, REMINDER_WINDOW_MINUTES),
    };

    const dayBounds = getLocalDayBounds(now);

    const tasks = await prisma.task.findMany({
      where: {
        isRecurring: true,
        dueTime: { not: null },
        status: { in: ["TODO", "IN_PROGRESS"] },
        OR: [
          {
            parentTaskId: { not: null },
            dueDate: { gte: dayBounds.start, lte: dayBounds.end },
          },
          {
            parentTaskId: null,
            dueDate: { gte: dayBounds.start, lte: dayBounds.end },
          },
        ],
      },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
      },
    });

    let sentCount = 0;

    for (const task of tasks) {
      if (!task.dueTime) continue;

      const occurrenceDate = task.dueDate ? getLocalDayDate(task.dueDate) : today;
      if (!isRoutineScheduledForDay(task, occurrenceDate)) {
        continue;
      }

      const dueDateTime = combineLocalDateAndTime(occurrenceDate, task.dueTime);
      if (!isWithinInterval(dueDateTime, { start: windowStart, end: windowEnd })) {
        continue;
      }

      const targetUserId = task.assigneeId || task.creatorId;
      if (!targetUserId) continue;

      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: targetUserId,
          type: "TASK_REMINDER",
          title: { startsWith: "Czas na rutynę" },
          message: task.title,
          createdAt: { gte: addMinutes(now, -REMINDER_WINDOW_MINUTES * 2) },
        },
      });

      if (existingNotification) continue;

      await createNotification({
        userId: targetUserId,
        householdId: task.householdId,
        title: "Czas na rutynę!",
        message: task.title,
        type: "TASK_REMINDER",
        link: `/tasks?filter=routines`,
      });

      sentCount++;
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in routine reminders cron:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
