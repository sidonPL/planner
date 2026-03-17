import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AnniversaryType } from "@prisma/client";

const anniversarySchema = z.object({
  title: z.string().min(1, "Tytuł jest wymagany"),
  description: z.string().optional(),
  date: z.string().transform(val => new Date(val)),
  type: z.nativeEnum(AnniversaryType),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// GET - pobierz rocznice
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const anniversaries = await prisma.anniversary.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(anniversaries);
  } catch (error) {
    console.error("Error fetching anniversaries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - utwórz rocznicę
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = anniversarySchema.parse(body);

    const anniversary = await prisma.anniversary.create({
      data: {
        ...validatedData,
        householdId: session.user.householdId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(anniversary, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating anniversary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

