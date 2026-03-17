import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const participantSchema = z.object({
  userId: z.string(),
  role: z.string().optional(),
});

// POST - dodaj uczestnika do wyjazdu
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = participantSchema.parse(body);

    // Sprawdź czy wyjazd należy do gospodarstwa użytkownika
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Sprawdź czy użytkownik należy do tego samego gospodarstwa
    const user = await prisma.user.findFirst({
      where: {
        id: validatedData.userId,
        householdId: session.user.householdId,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Sprawdź czy uczestnik już nie jest dodany
    const existing = await prisma.tripParticipant.findUnique({
      where: {
        tripId_userId: {
          tripId: id,
          userId: validatedData.userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "User already participant" }, { status: 400 });
    }

    const participant = await prisma.tripParticipant.create({
      data: {
        tripId: id,
        userId: validatedData.userId,
        role: validatedData.role || "PARTICIPANT",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error adding participant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

