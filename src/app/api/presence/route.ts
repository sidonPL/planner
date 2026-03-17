import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const presenceSchema = z.object({
  userId: z.string(),
  status: z.enum(["HOME", "AWAY", "WORK", "SCHOOL", "VACATION"]),
});

// POST - aktualizuj status obecności
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = presenceSchema.parse(body);

    // Sprawdź czy użytkownik należy do tego samego gospodarstwa
    const targetUser = await prisma.user.findFirst({
      where: {
        id: validatedData.userId,
        householdId: session.user.householdId,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const presence = await prisma.presence.create({
      data: {
        userId: validatedData.userId,
        status: validatedData.status,
      },
    });

    return NextResponse.json(presence, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error updating presence:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - pobierz historię obecności
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const presence = await prisma.presence.findMany({
      where: {
        user: {
          householdId: session.user.householdId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 100,
    });

    return NextResponse.json(presence);
  } catch (error) {
    console.error("Error fetching presence:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

