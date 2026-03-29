import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { updateFutureOccurrences, deleteFutureOccurrences, regenerateRoutineInstances } from "@/lib/recurrence";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]).optional(),
  recurrenceInterval: z.number().optional(),
  recurrenceEndDate: z.string().optional().nullable(),
  recurrenceDays: z.array(z.number()).optional(),
  // Opcje dla zadań cyklicznych
  updateFuture: z.boolean().optional(), // czy zaktualizować przyszłe wystąpienia
  deleteAllOccurrences: z.boolean().optional(), // czy usunąć wszystkie wystąpienia
});

// GET - pobierz pojedyncze zadanie
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        category: true,
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        completions: {
          orderBy: {
            completedAt: "desc",
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - aktualizuj zadanie
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = taskSchema.parse(body);

    // Sprawdź czy zadanie istnieje i należy do tego gospodarstwa
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        isRecurring: true,
        parentTaskId: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Jeśli użytkownik chce zaktualizować wszystkie przyszłe wystąpienia
    if (validatedData.updateFuture && existingTask.isRecurring) {
      const updatedCount = await updateFutureOccurrences(id, {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
        dueTime: validatedData.dueTime || null,
        categoryId: validatedData.categoryId || null,
        assigneeId: validatedData.assigneeId || null,
      });

      console.log(`Zaktualizowano ${updatedCount} przyszłych wystąpień`);

      // Regeneruj instancje rutyny (usuń stare i wygeneruj nowe)
      if (validatedData.isRecurring) {
        try {
          await regenerateRoutineInstances(id);
        } catch (error) {
          console.error(`Error regenerating routine instances:`, error);
        }
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
        status: validatedData.status,
        categoryId: validatedData.categoryId || null,
        assigneeId: validatedData.assigneeId || null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        dueTime: validatedData.dueTime || null,
        isRecurring: validatedData.isRecurring,
        recurrenceType: validatedData.recurrenceType || null,
        recurrenceInterval: validatedData.recurrenceInterval || null,
      },
      include: {
        category: true,
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        completions: {
          orderBy: {
            completedAt: "desc",
          },
          take: 1,
        },
      },
    });

    // Jeśli to rutyna, regeneruj instancje (jeśli zmieniły się parametry cykliczności)
    if (task.isRecurring && task.recurrenceType && !validatedData.updateFuture) {
      try {
        await regenerateRoutineInstances(id);
      } catch (error) {
        console.error(`Error regenerating routine instances:`, error);
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń zadanie
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

    // Pobierz opcję z query params
    const url = new URL(req.url);
    const deleteAll = url.searchParams.get("deleteAll") === "true";
    const deleteFuture = url.searchParams.get("deleteFuture") === "true";

    // Sprawdź czy zadanie istnieje i należy do tego gospodarstwa
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        isRecurring: true,
        parentTaskId: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Jeśli zadanie jest cykliczne i użytkownik chce usunąć przyszłe wystąpienia
    if (existingTask.isRecurring && deleteFuture) {
      const deletedCount = await deleteFutureOccurrences(id);
      // Revalidate calendar and tasks pages
      revalidatePath('/calendar');
      revalidatePath('/tasks');
      return NextResponse.json({ success: true, deletedCount });
    }

    // Jeśli zadanie jest cykliczne i użytkownik chce usunąć wszystkie wystąpienia
    if (existingTask.isRecurring && deleteAll) {
      const parentId = existingTask.parentTaskId || existingTask.id;

      // Usuń wszystkie powiązane zadania
      await prisma.task.deleteMany({
        where: {
          OR: [
            { id: parentId },
            { parentTaskId: parentId },
          ],
          householdId: session.user.householdId,
        },
      });

      // Revalidate calendar and tasks pages
      revalidatePath('/calendar');
      revalidatePath('/tasks');

      return NextResponse.json({ success: true, deletedAll: true });
    }

    // Domyślnie usuń tylko to jedno zadanie
    await prisma.task.delete({
      where: { id },
    });

    // Revalidate calendar and tasks pages
    revalidatePath('/calendar');
    revalidatePath('/tasks');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

