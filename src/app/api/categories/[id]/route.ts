// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\categories\[id]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const category = await prisma.category.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Kategoria nie znaleziona" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Błąd podczas pobierania kategorii:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać kategorii" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, color, icon } = body;

    // Sprawdź czy kategoria istnieje i należy do gospodarstwa
    const existing = await prisma.category.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Kategoria nie znaleziona" },
        { status: 404 }
      );
    }

    // Sprawdź czy inna kategoria nie ma już tej nazwy
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          householdId: session.user.householdId,
          name: name.trim(),
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Kategoria o tej nazwie już istnieje" },
          { status: 400 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
        ...(icon !== undefined && { icon }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Błąd podczas aktualizacji kategorii:", error);
    return NextResponse.json(
      { error: "Nie udało się zaktualizować kategorii" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Sprawdź czy kategoria istnieje i należy do gospodarstwa
    const existing = await prisma.category.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Kategoria nie znaleziona" },
        { status: 404 }
      );
    }

    // Odłącz zadania od kategorii przed usunięciem
    await prisma.task.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd podczas usuwania kategorii:", error);
    return NextResponse.json(
      { error: "Nie udało się usunąć kategorii" },
      { status: 500 }
    );
  }
}

