import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { broadcastPresenceChange } from "@/lib/presence-events";

const presenceSchema = z.object({
  userId: z.string(),
  status: z.enum(["HOME", "AWAY", "WORK", "SCHOOL", "VACATION"]),
  note: z.string().optional().nullable(),
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

    const canUpdateOthers = session.user.role === "ADMIN";
    if (validatedData.userId !== session.user.id && !canUpdateOthers) {
      return NextResponse.json(
        { error: "Możesz zmieniać tylko własny status obecności" },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: validatedData.userId,
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const lastPresence = await prisma.presence.findFirst({
      where: { userId: validatedData.userId },
      orderBy: { timestamp: "desc" },
    });

    if (lastPresence?.status === validatedData.status) {
      return NextResponse.json(lastPresence);
    }

    const presence = await prisma.presence.create({
      data: {
        userId: validatedData.userId,
        status: validatedData.status,
        note: validatedData.note ?? null,
      },
    });

    await broadcastPresenceChange(session.user.householdId, {
      id: presence.id,
      userId: targetUser.id,
      userName: targetUser.name || "Użytkownik",
      status: presence.status,
      timestamp: presence.timestamp.toISOString(),
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
