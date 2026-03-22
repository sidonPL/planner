import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE - Usuń szablon
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy szablon należy do gospodarstwa
    const template = await prisma.taskTemplate.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.taskTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Użyj szablonu (utwórz zadania z szablonu)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
        const { parentTaskTitle, assigneeId, clientRequestId } = body as {
      parentTaskTitle?: string | null;
      assigneeId?: string | null;
      clientRequestId?: string;
    };

    if (clientRequestId) {
      const duplicateApply = await prisma.auditLog.findFirst({
        where: {
          userId: session.user.id,
          householdId: session.user.householdId,
          action: "CREATE",
          entityType: "TaskTemplateApply",
          entityId: `${id}:${clientRequestId}`,
        },
        select: { id: true },
      });

      if (duplicateApply) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          tasksCreated: 0,
          tasks: [],
        });
      }
    }

    // Pobierz szablon
    const template = await prisma.taskTemplate.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        taskTemplates: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Utwórz parent task jeśli podano tytuł
    let parentTaskId: string | undefined;
    if (parentTaskTitle && parentTaskTitle.trim()) {
      const parentTask = await prisma.task.create({
        data: {
          title: parentTaskTitle.trim(),
          description: template.description,
          householdId: session.user.householdId,
          creatorId: session.user.id,
          assigneeId: assigneeId || null,
          priority: "MEDIUM",
          status: "TODO",
        },
      });
      parentTaskId = parentTask.id;
    }

    // Utwórz zadania z szablonu
    const tasks = await Promise.all(
      template.taskTemplates.map((taskTemplate) =>
        prisma.task.create({
          data: {
            title: taskTemplate.title,
            description: taskTemplate.description ?? undefined,
            priority: taskTemplate.priority,
            estimatedMinutes: taskTemplate.estimatedMinutes ?? undefined,
            categoryId: taskTemplate.categoryId ?? undefined,
            householdId: session.user.householdId!,
            creatorId: session.user.id,
            assigneeId: assigneeId || null,
            status: "TODO",
            subtaskParentId: parentTaskId || null,
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
        })
      )
    );

    if (clientRequestId) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          householdId: session.user.householdId,
          action: "CREATE",
          entityType: "TaskTemplateApply",
          entityId: `${id}:${clientRequestId}`,
          entityName: template.name,
          metadata: {
            tasksCreated: tasks.length,
            parentTaskId,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      tasksCreated: tasks.length,
      tasks,
      parentTaskId,
    });
  } catch (error) {
    console.error("Error using template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

