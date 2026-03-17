import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const transportSchema = z.object({
  type: z.string().min(1, "Typ transportu jest wymagany"),
  name: z.string().optional(),
  departureFrom: z.string().optional(),
  arrivalTo: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  bookingRef: z.string().optional(),
  seatNumber: z.string().optional(),
  notes: z.string().optional(),
});

// GET - pobierz wszystkie transporty
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

    const transports = await prisma.tripTransport.findMany({
      where: { tripId: id },
      orderBy: { departureTime: "asc" },
    });

    return NextResponse.json(transports);
  } catch (error) {
    console.error("Error fetching transports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj transport
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
    const validatedData = transportSchema.parse(body);

    const transport = await prisma.tripTransport.create({
      data: {
        ...validatedData,
        departureTime: validatedData.departureTime ? new Date(validatedData.departureTime) : undefined,
        arrivalTime: validatedData.arrivalTime ? new Date(validatedData.arrivalTime) : undefined,
        tripId: id,
      },
    });

    return NextResponse.json(transport, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating transport:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

