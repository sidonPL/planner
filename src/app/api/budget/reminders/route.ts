import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";

const reminderSchema = z.object({
  transactionId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number(),
  dueDate: z.string(), // ISO date
  recurring: z.boolean().default(false),
  recurrencePattern: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]).optional(),
  categoryId: z.string().optional(),
  notifyDaysBefore: z.number().min(0).max(30).default(3),
});

// GET - pobierz przypomnienia
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reminders = await prisma.paymentReminder.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        category: true,
        transaction: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - stwórz przypomnienie
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = reminderSchema.parse(body);

    const reminder = await prisma.paymentReminder.create({
      data: {
        title: data.title,
        description: data.description,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        recurring: data.recurring,
        recurrencePattern: data.recurrencePattern,
        categoryId: data.categoryId,
        transactionId: data.transactionId,
        notifyDaysBefore: data.notifyDaysBefore,
        householdId: session.user.householdId,
      },
      include: {
        category: true,
      },
    });

    // Stwórz powiadomienie jeśli termin blisko
    const daysDiff = Math.ceil(
      (new Date(data.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= data.notifyDaysBefore && daysDiff >= 0) {
      // Wyślij powiadomienie do wszystkich członków gospodarstwa
      const members = await prisma.user.findMany({
        where: { householdId: session.user.householdId },
        select: { id: true },
      });

      for (const member of members) {
        await createNotification({
          userId: member.id,
          householdId: session.user.householdId,
          title: `Przypomnienie o płatności: ${data.title}`,
          message: `Płatność ${data.amount} zł za ${daysDiff} dni (${new Date(data.dueDate).toLocaleDateString()})`,
          type: "PAYMENT_REMINDER",
          link: "/budget",
        });
      }
    }

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating reminder:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

