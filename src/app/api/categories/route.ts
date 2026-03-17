// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\categories\route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await prisma.category.findMany({
      where: { householdId: session.user.householdId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Błąd podczas pobierania kategorii:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać kategorii" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, color, icon } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nazwa kategorii jest wymagana" },
        { status: 400 }
      );
    }

    // Sprawdź czy kategoria o tej nazwie już istnieje
    const existing = await prisma.category.findFirst({
      where: {
        householdId: session.user.householdId,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Kategoria o tej nazwie już istnieje" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        color: color || "#6B7280",
        icon: icon || null,
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Błąd podczas tworzenia kategorii:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć kategorii" },
      { status: 500 }
    );
  }
}

