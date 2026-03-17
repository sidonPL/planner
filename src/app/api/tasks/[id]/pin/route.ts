import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/tasks/[id]/pin - toggle pin status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { pinned } = body;

    // Sprawdź czy zadanie należy do gospodarstwa użytkownika
    const task = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId!,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Zaktualizuj status przypięcia
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        isPinned: pinned,
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
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating task pin status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

