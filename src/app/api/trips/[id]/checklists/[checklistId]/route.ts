// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\trips\[id]\checklists\[checklistId]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId, checklistId } = await params;

  try {
    // Sprawdź czy wyjazd istnieje i użytkownik ma dostęp
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        householdId: session.user.householdId!,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Wyjazd nie znaleziony" }, { status: 404 });
    }

    // Usuń checklistę (cascade usunie też items)
    await prisma.tripChecklist.delete({
      where: {
        id: checklistId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd podczas usuwania checklisty:", error);
    return NextResponse.json(
      { error: "Nie udało się usunąć checklisty" },
      { status: 500 }
    );
  }
}

