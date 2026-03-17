import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH - aktualizuj element checklisty
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; checklistId: string; itemId: string }> }
) {
  try {
    const session = await auth();
    const { id, itemId } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Sprawdź czy trip należy do tego gospodarstwa
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const item = await prisma.tripChecklistItem.update({
      where: { id: itemId },
      data: body,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating checklist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

