import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - Pobierz etykiety zadania
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
        labels: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task.labels);
  } catch (error) {
    console.error("Error fetching task labels:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Przypisz etykietę do zadania
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { labelId } = body;

    if (!labelId) {
      return NextResponse.json({ error: "Label ID is required" }, { status: 400 });
    }

    // Sprawdź czy zadanie i etykieta należą do gospodarstwa
    const [task, label] = await Promise.all([
      prisma.task.findFirst({
        where: {
          id,
          householdId: session.user.householdId,
        },
      }),
      prisma.taskLabel.findFirst({
        where: {
          id: labelId,
          householdId: session.user.householdId,
        },
      }),
    ]);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Przypisz etykietę
    await prisma.task.update({
      where: { id },
      data: {
        labels: {
          connect: { id: labelId },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding label to task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Usuń etykietę z zadania
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const labelId = searchParams.get("labelId");

    if (!labelId) {
      return NextResponse.json({ error: "Label ID is required" }, { status: 400 });
    }

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

    // Usuń etykietę
    await prisma.task.update({
      where: { id },
      data: {
        labels: {
          disconnect: { id: labelId },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing label from task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

