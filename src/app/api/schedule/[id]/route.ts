import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - pobierz szczegóły harmonogramu
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
    const schedule = await prisma.schedule.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        exceptions: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Harmonogram nie znaleziony" },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Błąd podczas pobierania harmonogramu:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać harmonogramu" },
      { status: 500 }
    );
  }
}

// DELETE - usuń harmonogram
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
    // Sprawdź czy harmonogram istnieje i należy do gospodarstwa
    const schedule = await prisma.schedule.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Harmonogram nie znaleziony" },
        { status: 404 }
      );
    }

    // Usuń harmonogram (wyjątki zostaną usunięte automatycznie przez onDelete: Cascade)
    await prisma.schedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd podczas usuwania harmonogramu:", error);
    return NextResponse.json(
      { error: "Nie udało się usunąć harmonogramu" },
      { status: 500 }
    );
  }
}

// PATCH - edytuj harmonogram
export async function PATCH(
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
    const { name, type, dayOfWeek, startTime, endTime, location, isActive } = body;

    // Sprawdź czy harmonogram istnieje i należy do gospodarstwa
    const schedule = await prisma.schedule.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Harmonogram nie znaleziony" },
        { status: 404 }
      );
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(dayOfWeek && { dayOfWeek }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(location !== undefined && { location }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        exceptions: {
          orderBy: { date: "asc" },
        },
      },
    });

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error("Błąd podczas edycji harmonogramu:", error);
    return NextResponse.json(
      { error: "Nie udało się edytować harmonogramu" },
      { status: 500 }
    );
  }
}

