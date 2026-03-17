import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

// GET - Pobierz wszystkie zewnętrzne urodziny
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const externalBirthdays = await prisma.externalBirthday.findMany({
      where: {
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
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(externalBirthdays);
  } catch (error) {
    console.error("Error fetching external birthdays:", error);
    return NextResponse.json(
      { error: "Failed to fetch external birthdays" },
      { status: 500 }
    );
  }
}

// POST - Dodaj nowe zewnętrzne urodziny
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = externalBirthdaySchema.parse(body);

    const externalBirthday = await prisma.externalBirthday.create({
      data: {
        name: validatedData.name,
        birthDate: new Date(validatedData.birthDate),
        relationship: validatedData.relationship,
        phone: validatedData.phone,
        email: validatedData.email || null,
        notes: validatedData.notes,
        color: validatedData.color || "#EC4899",
        householdId: session.user.householdId,
        createdById: session.user.id,
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

    return NextResponse.json(externalBirthday, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating external birthday:", error);
    return NextResponse.json(
      { error: "Failed to create external birthday" },
      { status: 500 }
    );
  }
}

