import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getNameDayDateByName, normalizeNameDayInput } from "@/lib/namedays-resolver";
import { z } from "zod";

const externalBirthdaySchema = z.object({
  name: z.string().min(1, "Imię jest wymagane"),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Nieprawidłowa data",
  }),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  nameDay: z.string().optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

// GET - Pobierz pojedyncze zewnętrzne urodziny
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const externalBirthday = await prisma.externalBirthday.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!externalBirthday) {
      return NextResponse.json(
        { error: "External birthday not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(externalBirthday);
  } catch (error) {
    console.error("Error fetching external birthday:", error);
    return NextResponse.json(
      { error: "Failed to fetch external birthday" },
      { status: 500 }
    );
  }
}

// PUT - Aktualizuj zewnętrzne urodziny
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy urodziny należą do gospodarstwa użytkownika
    const existing = await prisma.externalBirthday.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "External birthday not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = externalBirthdaySchema.parse(body);
    const manualNameDay = validatedData.nameDay?.trim();

    if (manualNameDay) {
      const normalized = normalizeNameDayInput(manualNameDay);
      const resolvedFromName = normalized ? null : getNameDayDateByName(manualNameDay);
      if (!normalized && !resolvedFromName) {
        return NextResponse.json(
          { error: "Nie znaleziono imienin dla podanej wartosci. Wpisz date recznie (DD-MM), np. 24-06." },
          { status: 400 }
        );
      }
    }

    const resolvedNameDay = manualNameDay
      ? (normalizeNameDayInput(manualNameDay) || getNameDayDateByName(manualNameDay))
      : getNameDayDateByName(validatedData.name);

    const updated = await prisma.externalBirthday.update({
      where: { id },
      data: {
        name: validatedData.name,
        birthDate: new Date(validatedData.birthDate),
        nameDay: resolvedNameDay,
        relationship: validatedData.relationship,
        phone: validatedData.phone,
        email: validatedData.email || null,
        notes: validatedData.notes,
        color: validatedData.color || "#EC4899",
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating external birthday:", error);
    return NextResponse.json(
      { error: "Failed to update external birthday" },
      { status: 500 }
    );
  }
}

// DELETE - Usuń zewnętrzne urodziny
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy urodziny należą do gospodarstwa użytkownika
    const existing = await prisma.externalBirthday.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "External birthday not found" },
        { status: 404 }
      );
    }

    await prisma.externalBirthday.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting external birthday:", error);
    return NextResponse.json(
      { error: "Failed to delete external birthday" },
      { status: 500 }
    );
  }
}

