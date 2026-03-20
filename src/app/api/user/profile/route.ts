import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getNameDayDateByName, normalizeNameDayInput } from "@/lib/namedays-resolver";
import { z } from "zod";

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  avatar: z.string().optional(),
  birthDate: z.string().nullable().optional().transform((val) => (val ? new Date(val) : undefined)),
  nameDay: z.string().nullable().optional(),
});

// GET - pobierz profil
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        color: true,
        birthDate: true,
        nameDay: true,
        role: true,
        householdId: true,
        household: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - aktualizuj profil
export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = profileUpdateSchema.parse(body);
    if (validatedData.nameDay) {
      const normalized = normalizeNameDayInput(validatedData.nameDay);
      const resolvedFromName = normalized ? null : getNameDayDateByName(validatedData.nameDay);
      if (!normalized && !resolvedFromName) {
        return NextResponse.json(
          { error: "Nie znaleziono imienin dla podanej wartosci. Wpisz date recznie (DD-MM), np. 24-06." },
          { status: 400 }
        );
      }
    }

    const resolvedNameDay = validatedData.nameDay
      ? (normalizeNameDayInput(validatedData.nameDay) || getNameDayDateByName(validatedData.nameDay))
      : validatedData.name
        ? getNameDayDateByName(validatedData.name)
        : undefined;

    // Sprawdź czy email nie jest już zajęty przez innego użytkownika
    if (validatedData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id: session.user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email jest już używany przez innego użytkownika" },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...validatedData,
        ...(resolvedNameDay !== undefined ? { nameDay: resolvedNameDay } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        color: true,
        birthDate: true,
        nameDay: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - alias dla PATCH (dla kompatybilności)
export async function PUT(req: Request) {
  return PATCH(req);
}

