import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const accommodationSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  type: z.string().default("hotel"),
  address: z.string().optional(),
  phone: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  roomInfo: z.string().optional(),
  bookingRef: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

// GET - pobierz wszystkie zakwaterowania
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

    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const accommodations = await prisma.tripAccommodation.findMany({
      where: { tripId: id },
      orderBy: { checkIn: "asc" },
    });

    return NextResponse.json(accommodations);
  } catch (error) {
    console.error("Error fetching accommodations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj zakwaterowanie
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
    const validatedData = accommodationSchema.parse(body);

    const accommodation = await prisma.tripAccommodation.create({
      data: {
        ...validatedData,
        checkIn: validatedData.checkIn ? new Date(validatedData.checkIn) : undefined,
        checkOut: validatedData.checkOut ? new Date(validatedData.checkOut) : undefined,
        tripId: id,
      },
    });

    return NextResponse.json(accommodation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating accommodation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

