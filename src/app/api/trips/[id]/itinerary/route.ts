import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const itineraryActivitySchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format czasu: HH:mm"),
  title: z.string().min(1, "Tytuł jest wymagany"),
  description: z.string().optional(),
  location: z.string().optional(),
  duration: z.number().int().positive().optional(),
  category: z.enum(["transport", "jedzenie", "zwiedzanie", "wypoczynek", "inne"]).optional(),
  notes: z.string().optional(),
});

const itineraryDaySchema = z.object({
  date: z.string().transform(val => new Date(val)),
  title: z.string().optional(),
  notes: z.string().optional(),
  activities: z.array(itineraryActivitySchema),
});

// GET - pobierz plan wyjazdu
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy wycieczka należy do gospodarstwa użytkownika
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const itinerary = await prisma.tripItineraryDay.findMany({
      where: { tripId: id },
      include: {
        activities: {
          orderBy: { time: "asc" },
        },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(itinerary);
  } catch (error) {
    console.error("Error fetching itinerary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj dzień do planu
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

    // Sprawdź czy wycieczka należy do gospodarstwa użytkownika
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = itineraryDaySchema.parse(body);

    const { activities, ...dayData } = validatedData;

    const day = await prisma.tripItineraryDay.create({
      data: {
        ...dayData,
        tripId: id,
        activities: {
          create: activities,
        },
      },
      include: {
        activities: {
          orderBy: { time: "asc" },
        },
      },
    });

    return NextResponse.json(day, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating itinerary day:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

