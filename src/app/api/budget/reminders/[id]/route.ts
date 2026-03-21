import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";

const updateReminderSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  dueDate: z.string().optional(),
  recurring: z.boolean().optional(),
  recurrencePattern: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]).optional(),
  categoryId: z.string().optional(),
  notifyDaysBefore: z.number().min(0).max(30).optional(),
  isPaid: z.boolean().optional(),
});

// PATCH - zaktualizuj przypomnienie
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sprawdź czy przypomnienie należy do tego gospodarstwa
    const reminder = await prisma.paymentReminder.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = updateReminderSchema.parse(body);

    const updateData: Partial<typeof reminder> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.recurring !== undefined) updateData.recurring = data.recurring;
    if (data.recurrencePattern !== undefined) updateData.recurrencePattern = data.recurrencePattern;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.notifyDaysBefore !== undefined) updateData.notifyDaysBefore = data.notifyDaysBefore;
    if (data.isPaid !== undefined) updateData.isPaid = data.isPaid;

    const updated = await prisma.paymentReminder.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    // Jeśli oznaczono jako opłacone, wyślij powiadomienie
    if (data.isPaid === true && !reminder.isPaid) {
      const members = await prisma.user.findMany({
        where: { householdId: session.user.householdId },
        select: { id: true },
      });

      for (const member of members) {
        await createNotification({
          userId: member.id,
          householdId: session.user.householdId,
          title: `Płatność opłacona: ${updated.title}`,
          message: `Płatność ${updated.amount} zł za "${updated.title}" została oznaczona jako opłacona`,
          type: "SYSTEM",
          link: "/budget",
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error updating reminder:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń przypomnienie
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sprawdź czy przypomnienie należy do tego gospodarstwa
    const reminder = await prisma.paymentReminder.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    await prisma.paymentReminder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


