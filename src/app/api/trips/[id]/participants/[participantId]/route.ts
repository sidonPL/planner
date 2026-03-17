import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE - usuń uczestnika z wyjazdu
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, participantId } = await params;

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

    // Sprawdź czy uczestnik należy do tego wyjazdu
    const participant = await prisma.tripParticipant.findFirst({
      where: {
        id: participantId,
        tripId: id,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    await prisma.tripParticipant.delete({
      where: { id: participantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting participant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

