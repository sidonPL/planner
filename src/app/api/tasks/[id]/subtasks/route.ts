import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - Pobierz podzadania zadania
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        subtasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                avatar: true,
                color: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task.subtasks);
  } catch (error) {
    console.error("Error fetching subtasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Utwórz podzadanie
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, assigneeId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Sprawdź czy parent task należy do gospodarstwa
    const parentTask = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!parentTask) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

    // Utwórz podzadanie
    const subtask = await prisma.task.create({
      data: {
        title: title.trim(),
        householdId: session.user.householdId,
        creatorId: session.user.id,
        subtaskParentId: id,
        assigneeId: assigneeId || null,
        status: "TODO",
        priority: parentTask.priority, // Dziedzicz priorytet z parent
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(subtask);
  } catch (error) {
    console.error("Error creating subtask:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

