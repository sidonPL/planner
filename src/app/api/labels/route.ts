import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - Pobierz wszystkie etykiety gospodarstwa
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const labels = await prisma.taskLabel.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        tasks: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Dodaj liczbę zadań z daną etykietą
    const labelsWithCount = labels.map((label) => ({
      ...label,
      taskCount: label.tasks.length,
      tasks: undefined, // Usuń szczegóły zadań
    }));

    return NextResponse.json(labelsWithCount);
  } catch (error) {
    console.error("Error fetching labels:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Utwórz nową etykietę
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!color || !color.match(/^#[0-9A-F]{6}$/i)) {
      return NextResponse.json({ error: "Valid color is required" }, { status: 400 });
    }

    // Sprawdź czy etykieta o tej nazwie już istnieje
    const existing = await prisma.taskLabel.findUnique({
      where: {
        householdId_name: {
          householdId: session.user.householdId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Label with this name already exists" }, { status: 400 });
    }

    const label = await prisma.taskLabel.create({
      data: {
        name: name.trim(),
        color,
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json(label);
  } catch (error) {
    console.error("Error creating label:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

