import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateScheduleSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["WORK", "SCHOOL", "UNIVERSITY", "COURSE", "OTHER"]).optional(),
  userId: z.string().optional(),
  dayOfWeek: z.array(z.number().min(0).max(6)).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isOneTime: z.boolean().optional(),
  oneTimeDate: z.string().nullable().optional(),
  recurrenceUnit: z.enum(["WEEKLY", "MONTHLY"]).optional(),
  repeatEvery: z.number().int().min(1).max(60).optional(),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
  specificDates: z.array(z.string()).optional(),
});

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
    const validatedData = updateScheduleSchema.parse(body);

    if (validatedData.effectiveFrom && validatedData.effectiveTo) {
      const from = new Date(validatedData.effectiveFrom);
      const to = new Date(validatedData.effectiveTo);
      if (from > to) {
        return NextResponse.json(
          { error: "Data koncowa musi byc pozniejsza od poczatkowej" },
          { status: 400 }
        );
      }
    }

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
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.type && { type: validatedData.type }),
        ...(validatedData.userId && { userId: validatedData.userId }),
        ...(validatedData.dayOfWeek && { dayOfWeek: validatedData.dayOfWeek }),
        ...(validatedData.startTime && { startTime: validatedData.startTime }),
        ...(validatedData.endTime && { endTime: validatedData.endTime }),
        ...(validatedData.location !== undefined && { location: validatedData.location }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        ...(validatedData.isOneTime !== undefined && { isOneTime: validatedData.isOneTime }),
        ...(validatedData.oneTimeDate !== undefined && {
          oneTimeDate: validatedData.oneTimeDate ? new Date(validatedData.oneTimeDate) : null,
        }),
        ...(validatedData.recurrenceUnit && { recurrenceUnit: validatedData.recurrenceUnit }),
        ...(validatedData.repeatEvery !== undefined && { repeatEvery: validatedData.repeatEvery }),
        ...(validatedData.effectiveFrom !== undefined && {
          effectiveFrom: validatedData.effectiveFrom ? new Date(validatedData.effectiveFrom) : null,
        }),
        ...(validatedData.effectiveTo !== undefined && {
          effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null,
        }),
        ...(validatedData.specificDates !== undefined && {
          specificDates: validatedData.specificDates.map((date) => new Date(date)),
        }),
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Nieprawidlowe dane", details: error.issues }, { status: 400 });
    }
    console.error("Błąd podczas edycji harmonogramu:", error);
    return NextResponse.json(
      { error: "Nie udało się edytować harmonogramu" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params });
}

