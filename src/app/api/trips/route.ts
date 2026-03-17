import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createTripEvent } from "@/lib/trip-helpers";

const tripSchema = z.object({
  name: z.string().min(1),
  destination: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  participants: z.array(z.string()).optional(),
});

// GET - pobierz wyjazdy
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trips = await prisma.trip.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                color: true,
              },
            },
          },
        },
        checklists: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return NextResponse.json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - utwórz wyjazd
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = tripSchema.parse(body);

    const trip = await prisma.trip.create({
      data: {
        name: validatedData.name,
        destination: validatedData.destination,
        description: validatedData.description,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        householdId: session.user.householdId,
        participants: {
          create: [
            // Twórca jest zawsze uczestnikiem jako organizator
            { userId: session.user.id, role: "ORGANIZER" },
            // Dodaj pozostałych uczestników
            ...(validatedData.participants || [])
              .filter((id) => id !== session.user.id)
              .map((userId) => ({ userId, role: "PARTICIPANT" as const })),
          ],
        },
        // Utwórz domyślną checklistę
        checklists: {
          create: {
            name: "Rzeczy do zabrania",
            items: {
              create: [
                { name: "Dokumenty (dowód, paszport)" },
                { name: "Ładowarka do telefonu" },
                { name: "Leki" },
              ],
            },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                color: true,
              },
            },
          },
        },
        checklists: {
          include: {
            items: true,
          },
        },
      },
    });

    // Auto-utwórz event w kalendarzu
    try {
      await createTripEvent(trip.id);
    } catch (error) {
      console.error("Error creating trip event:", error);
      // Nie blokuj tworzenia wyjazdu jeśli event się nie utworzy
    }

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating trip:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

