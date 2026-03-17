import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { updateFutureOccurrences, deleteFutureOccurrences, regenerateRoutineInstances } from "@/lib/recurrence";

const updateRoutineSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueTime: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  reminderMinutes: z.array(z.number()).optional(),
  recurrenceType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]).optional(),
  recurrenceInterval: z.number().optional(),
  recurrenceDays: z.array(z.number()).optional(),
  recurrenceEndDate: z.string().optional().nullable(),
  updateScope: z.enum(["single", "future", "all"]).default("future"),
});

// PATCH - Aktualizuj rutynę (pojedynczą instancję lub wszystkie przyszłe)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await req.json();
    const validatedData = updateRoutineSchema.parse(body);
    const { updateScope, ...updates } = validatedData;

    // Pobierz zadanie
    const task = await prisma.task.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        title: true,
        householdId: true,
        parentTaskId: true,
        isRecurring: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Zadanie nie znalezione" }, { status: 404 });
    }

    if (task.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
    }

    if (!task.isRecurring) {
      return NextResponse.json(
        { error: "To nie jest zadanie cykliczne" },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    const parentId = task.parentTaskId || task.id;

    if (updateScope === "single") {
      // Aktualizuj tylko tę instancję
      await prisma.task.update({
        where: { id: resolvedParams.id },
        data: updates,
      });
      updatedCount = 1;
    } else if (updateScope === "future") {
      // Aktualizuj wszystkie przyszłe instancje
      updatedCount = await updateFutureOccurrences(resolvedParams.id, updates);
    } else if (updateScope === "all") {
      // Aktualizuj wszystkie instancje (włącznie z przeszłymi)
      const result = await prisma.task.updateMany({
        where: {
          OR: [
            { id: parentId },
            { parentTaskId: parentId },
          ],
        },
        data: updates,
      });
      updatedCount = result.count;
    }

    // Jeśli zmieniono parametry cyklu, regeneruj instancje
    if (
      updateScope !== "single" &&
      (updates.recurrenceType || updates.recurrenceInterval || updates.recurrenceDays)
    ) {
      await regenerateRoutineInstances(parentId);
    }

    await logAudit({
      userId: session.user.id,
      householdId: session.user.householdId,
      action: "UPDATE",
      entityType: "TASK",
      entityId: resolvedParams.id,
      metadata: {
        updateScope,
        updatedCount,
        changes: updates,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Zaktualizowano ${updatedCount} instancji rutyny`,
    });
  } catch (error) {
    console.error("Error updating routine:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane", issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

// DELETE - Usuń rutynę (pojedynczą instancję lub wszystkie przyszłe)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { searchParams } = new URL(req.url);
    const deleteScope = searchParams.get("scope") || "future"; // "single", "future", "all"

    // Pobierz zadanie
    const task = await prisma.task.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        title: true,
        householdId: true,
        parentTaskId: true,
        isRecurring: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Zadanie nie znalezione" }, { status: 404 });
    }

    if (task.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
    }

    if (!task.isRecurring) {
      return NextResponse.json(
        { error: "To nie jest zadanie cykliczne" },
        { status: 400 }
      );
    }

    let deletedCount = 0;
    const parentId = task.parentTaskId || task.id;

    if (deleteScope === "single") {
      // Usuń tylko tę instancję
      await prisma.task.delete({
        where: { id: resolvedParams.id },
      });
      deletedCount = 1;
    } else if (deleteScope === "future") {
      // Usuń wszystkie przyszłe instancje
      deletedCount = await deleteFutureOccurrences(resolvedParams.id);
    } else if (deleteScope === "all") {
      // Usuń wszystkie instancje (włącznie z przeszłymi)
      const result = await prisma.task.deleteMany({
        where: {
          OR: [
            { id: parentId },
            { parentTaskId: parentId },
          ],
        },
      });
      deletedCount = result.count;
    }

    await logAudit({
      userId: session.user.id,
      householdId: session.user.householdId,
      action: "DELETE",
      entityType: "TASK",
      entityId: resolvedParams.id,
      metadata: {
        deleteScope,
        deletedCount,
        taskTitle: task.title,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Usunięto ${deletedCount} instancji rutyny`,
    });
  } catch (error) {
    console.error("Error deleting routine:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

