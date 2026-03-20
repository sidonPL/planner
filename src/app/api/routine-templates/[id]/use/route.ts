import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { generateRoutineInstances } from "@/lib/recurrence";
import { Priority, RecurrenceType } from "@prisma/client";

const ALLOWED_PRIORITIES = new Set<Priority>(["LOW", "MEDIUM", "HIGH", "URGENT"]);

function normalizePriority(priority: string): Priority {
  return ALLOWED_PRIORITIES.has(priority as Priority) ? (priority as Priority) : "MEDIUM";
}

// POST - użyj szablonu (utwórz zadania z szablonu)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: templateId } = await params;
    const body = await req.json();
    const { categoryId, assigneeId, startDate } = body;

    // Pobierz szablon
    const template = await prisma.routineTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Sprawdź dostęp
    if (!template.isPublic && template.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const tasks = template.tasks as Array<{
      title: string;
      time: string;
      priority: string;
    }>;

    // Utwórz zadania z szablonu
    const createdTasks = await Promise.all(
      tasks.map((taskData) => {
        return prisma.task.create({
          data: {
            title: taskData.title,
            priority: normalizePriority(taskData.priority),
            dueTime: taskData.time,
            dueDate: startDate ? new Date(startDate) : null,
            isRecurring: true,
            recurrenceType: template.category === 'daily'
              ? RecurrenceType.DAILY
              : template.category === 'weekly'
                ? RecurrenceType.WEEKLY
                : template.category === 'monthly'
                  ? RecurrenceType.MONTHLY
                  : RecurrenceType.DAILY,
            recurrenceInterval: 1,
            categoryId: categoryId || null,
            assigneeId: assigneeId || null,
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

    // Wygeneruj instancje rutyn na miesiąc do przodu
    for (const task of createdTasks) {
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
          recurrenceDays: task.recurrenceDays,
          reminderMinutes: task.reminderMinutes,
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

    // Log audit
    await logAudit({
      userId: session.user.id,
      householdId: session.user.householdId,
      action: "CREATE",
      entityType: "Task",
      entityId: `template-${templateId}`,
      entityName: `${template.name} (${createdTasks.length} zadań)`,
    });

    return NextResponse.json(createdTasks, { status: 201 });
  } catch (error) {
    console.error("Error using routine template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

