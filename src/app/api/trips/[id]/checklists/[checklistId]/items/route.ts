import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/trips/[id]/checklists/[checklistId]/items - dodaj item do checklisty
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, checklistId } = await params;
    const body = await request.json();
    const { name, assigneeId } = body;

    // Sprawdź czy trip i checklist należą do gospodarstwa użytkownika
    const checklist = await prisma.tripChecklist.findFirst({
      where: {
        id: checklistId,
        tripId: id,
        trip: {
          householdId: session.user.householdId!,
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    const item = await prisma.tripChecklistItem.create({
      data: {
        name,
        checklistId,
        assignedTo: assigneeId,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error creating checklist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

