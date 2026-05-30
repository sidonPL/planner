import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { verifyCronAuth } from "@/lib/web-push";
import {
  differenceInLocalCalendarDaysFromKeys,
  getLocalDateKey,
  getLocalDayDate,
} from "@/lib/local-date";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const today = getLocalDayDate(now);

    const reminders = await prisma.paymentReminder.findMany({
      where: {
        isPaid: false,
        dueDate: {
          gte: today,
        },
      },
      include: {
        household: {
          include: {
            members: {
              select: { id: true },
            },
          },
        },
      },
    });

    const sent: { reminderId: string; userId: string }[] = [];

    for (const reminder of reminders) {
      const dueKey = getLocalDateKey(reminder.dueDate);
      const daysUntil = differenceInLocalCalendarDaysFromKeys(dueKey, todayKey);

      if (daysUntil < 0 || daysUntil > reminder.notifyDaysBefore) {
        continue;
      }

      const title = `Przypomnienie o płatności: ${reminder.title}`;
      const dueLabel =
        daysUntil === 0
          ? "dzisiaj"
          : daysUntil === 1
            ? "jutro"
            : `za ${daysUntil} dni`;

      for (const member of reminder.household.members) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: member.id,
            type: "PAYMENT_REMINDER",
            title,
            createdAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
          },
        });

        if (existing) continue;

        await createNotification({
          userId: member.id,
          householdId: reminder.householdId,
          title,
          message: `Termin płatności ${dueLabel}: ${reminder.amount.toFixed(2)} zł`,
          type: "PAYMENT_REMINDER",
          link: "/budget",
        });

        sent.push({ reminderId: reminder.id, userId: member.id });
      }
    }

    return NextResponse.json({
      success: true,
      sent: sent.length,
      notifications: sent,
    });
  } catch (error) {
    console.error("Error in payment reminders cron:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
