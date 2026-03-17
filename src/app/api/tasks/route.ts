import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifyTaskAssigned } from "@/lib/notifications";
import { z } from "zod";
import { generateRoutineInstances } from "@/lib/recurrence";
import { handleApiError, unauthorized } from "@/lib/api-error-handler";
import { sanitizePlainText, sanitizeRichHTML } from "@/lib/sanitize";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]).optional(),
  recurrenceInterval: z.number().optional(),
  recurrenceTimes: z.array(z.string()).optional(), // Wielokrotne godziny dziennie
});

// GET - pobierz wszystkie zadania
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: {
        householdId: session.user.householdId,
        isRecurring: false, // Wyklucz rutyny - są w osobnym API
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
        labels: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        subtasks: {
          select: {
            id: true,
            status: true,
          },
        },
        attachments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { dueDate: "asc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - utwórz nowe zadanie
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return unauthorized();
    }

    const body = await req.json();

    // SECURITY: Sanityzacja przed walidacją
    const sanitizedBody = {
      ...body,
      title: sanitizePlainText(body.title),
      description: sanitizeRichHTML(body.description),
    };

    const validatedData = taskSchema.parse(sanitizedBody);

    // Jeśli zadanie ma recurrenceTimes (wielokrotne godziny dziennie)
    if (validatedData.isRecurring && validatedData.recurrenceTimes && validatedData.recurrenceTimes.length > 0) {
      // Tworzymy osobne zadanie dla każdej godziny
      const tasks = await Promise.all(
        validatedData.recurrenceTimes.map(async (time) => {
          return prisma.task.create({
            data: {
              title: validatedData.title,
              description: validatedData.description,
              priority: validatedData.priority,
              categoryId: validatedData.categoryId || null,
              assigneeId: validatedData.assigneeId || null,
              dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
              dueTime: time || undefined, // Każda instancja ma swoją godzinę
              isRecurring: validatedData.isRecurring,
              recurrenceType: validatedData.recurrenceType || null,
              recurrenceInterval: validatedData.recurrenceInterval || null,
              recurrenceTimes: validatedData.recurrenceTimes, // Zachowujemy info o wszystkich godzinach
              householdId: session.user.householdId!,
              creatorId: session.user.id,
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
              completions: true,
            },
          });
        })
      );

      // Log audit dla każdego zadania
      await Promise.all(
        tasks.map((task) =>
          logAudit({
            userId: session.user.id,
            householdId: session.user.householdId || undefined,
            action: "CREATE",
            entityType: "Task",
            entityId: task.id,
            entityName: `${task.title} (${task.dueTime})`,
          })
        )
      );

      // Wygeneruj instancje rutyn na miesiąc do przodu
      for (const task of tasks) {
        try {
          await generateRoutineInstances({
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            isRecurring: task.isRecurring,
            recurrenceType: task.recurrenceType,
            recurrenceInterval: task.recurrenceInterval,
            recurrenceEndDate: task.recurrenceEndDate,
            recurrenceDays: task.recurrenceDays || [],
            reminderMinutes: task.reminderMinutes || [],
            householdId: task.householdId,
            categoryId: task.categoryId,
            assigneeId: task.assigneeId,
            creatorId: task.creatorId,
            parentTaskId: task.parentTaskId,
          });
        } catch (error) {
          console.error(`Error generating instances for task ${task.id}:`, error);
        }
      }

      return NextResponse.json(tasks, { status: 201 });
    }

    // Standardowe tworzenie zadania (bez wielu godzin)
    const task = await prisma.task.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
        categoryId: validatedData.categoryId || null,
        assigneeId: validatedData.assigneeId || null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        dueTime: validatedData.dueTime || undefined,
        isRecurring: validatedData.isRecurring,
        recurrenceType: validatedData.recurrenceType || null,
        recurrenceInterval: validatedData.recurrenceInterval || null,
        recurrenceTimes: validatedData.recurrenceTimes || [],
        householdId: session.user.householdId!,
        creatorId: session.user.id,
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
        completions: true,
      },
    });

    // Log audit
    await logAudit({
      userId: session.user.id,
      householdId: session.user.householdId,
      action: "CREATE",
      entityType: "Task",
      entityId: task.id,
      entityName: task.title,
    });

    // Wyślij powiadomienie jeśli zadanie jest przypisane i nie jest to twórca
    if (task.assigneeId && task.assigneeId !== session.user.id) {
      await notifyTaskAssigned(
        task.assigneeId,
        session.user.householdId!,
        task.title,
        task.id,
        session.user.name || "Ktoś"
      );
    }

    // Wygeneruj instancje rutyny na miesiąc do przodu (jeśli to rutyna)
    if (task.isRecurring && task.recurrenceType) {
      try {
        await generateRoutineInstances({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          isRecurring: task.isRecurring,
          recurrenceType: task.recurrenceType,
          recurrenceInterval: task.recurrenceInterval,
          recurrenceEndDate: task.recurrenceEndDate,
          recurrenceDays: task.recurrenceDays || [],
          reminderMinutes: task.reminderMinutes || [],
          householdId: task.householdId,
          categoryId: task.categoryId,
          assigneeId: task.assigneeId,
          creatorId: task.creatorId,
          parentTaskId: task.parentTaskId,
        });
      } catch (error) {
        console.error(`Error generating instances for task ${task.id}:`, error);
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

