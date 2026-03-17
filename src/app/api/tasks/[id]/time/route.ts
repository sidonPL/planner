import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - Pobierz wpisy czasu dla zadania
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
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                color: true,
              },
            },
          },
          orderBy: {
            startTime: "desc",
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task.timeEntries);
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Start timer lub dodaj manual entry
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { startTime, endTime, description, duration } = body;

    // Sprawdź czy zadanie należy do gospodarstwa
    const task = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Jeśli jest endTime, to manual entry (zakończony wpis)
    const timeEntry = await prisma.taskTimeEntry.create({
      data: {
        taskId: id,
        userId: session.user.id,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : null,
        description: description || null,
        duration: duration || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(timeEntry);
  } catch (error) {
    console.error("Error creating time entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

