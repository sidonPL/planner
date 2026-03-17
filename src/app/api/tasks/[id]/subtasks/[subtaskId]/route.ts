import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Aktualizuj podzadanie (głównie status - completed/not completed)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subtaskId } = await params;
    const body = await req.json();
    const { status, completed } = body;

    // Sprawdź czy podzadanie należy do gospodarstwa
    const subtask = await prisma.task.findFirst({
      where: {
        id: subtaskId,
        householdId: session.user.householdId,
      },
    });

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    // Jeśli przesłano 'completed', konwertuj na status
    let newStatus = status;
    if (completed !== undefined) {
      newStatus = completed ? "COMPLETED" : "TODO";
    }

    const updated = await prisma.task.update({
      where: { id: subtaskId },
      data: {
        status: newStatus || subtask.status,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating subtask:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Usuń podzadanie
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subtaskId } = await params;

    // Sprawdź czy podzadanie należy do gospodarstwa
    const subtask = await prisma.task.findFirst({
      where: {
        id: subtaskId,
        householdId: session.user.householdId,
      },
    });

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id: subtaskId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subtask:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

