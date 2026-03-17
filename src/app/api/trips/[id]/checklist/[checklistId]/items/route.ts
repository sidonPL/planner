import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST - dodaj element do checklisty
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const session = await auth();
    const { id, checklistId } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

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

    const item = await prisma.tripChecklistItem.create({
      data: {
        name,
        checklistId,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding checklist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

