// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\trips\[id]\checklists\route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId } = await params;

  try {
    const { name, items } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
    }

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

    // Utwórz checklistę z opcjonalnymi przedmiotami
    const checklist = await prisma.tripChecklist.create({
      data: {
        tripId,
        name,
        items: items?.length
          ? {
              create: items.map((itemName: string) => ({
                name: itemName,
                isPacked: false,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    console.error("Błąd podczas tworzenia checklisty:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć checklisty" },
      { status: 500 }
    );
  }
}

