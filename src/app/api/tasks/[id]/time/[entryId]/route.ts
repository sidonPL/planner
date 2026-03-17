import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Stop timer (zakończ wpis czasu)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;
    const body = await req.json();
    const { endTime, description } = body;

    // Znajdź wpis
    const entry = await prisma.taskTimeEntry.findFirst({
      where: {
        id: entryId,
        task: {
          householdId: session.user.householdId,
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Tylko właściciel może zaktualizować
    if (entry.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Oblicz duration
    const end = endTime ? new Date(endTime) : new Date();
    const start = new Date(entry.startTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    const updated = await prisma.taskTimeEntry.update({
      where: { id: entryId },
      data: {
        endTime: end,
        duration: durationMinutes,
        description: description || entry.description,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating time entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Usuń wpis czasu
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;

    // Znajdź wpis
    const entry = await prisma.taskTimeEntry.findFirst({
      where: {
        id: entryId,
        task: {
          householdId: session.user.householdId,
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Tylko właściciel może usunąć
    if (entry.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.taskTimeEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

