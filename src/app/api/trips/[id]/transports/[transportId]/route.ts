import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const transportSchema = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
  departureFrom: z.string().optional(),
  arrivalTo: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  bookingRef: z.string().optional(),
  seatNumber: z.string().optional(),
  notes: z.string().optional(),
});

// PATCH - edytuj transport
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; transportId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, transportId } = await params;

    const transport = await prisma.tripTransport.findFirst({
      where: {
        id: transportId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!transport) {
      return NextResponse.json({ error: "Transport not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = transportSchema.parse(body);

    const updated = await prisma.tripTransport.update({
      where: { id: transportId },
      data: {
        ...validatedData,
        departureTime: validatedData.departureTime ? new Date(validatedData.departureTime) : undefined,
        arrivalTime: validatedData.arrivalTime ? new Date(validatedData.arrivalTime) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating transport:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń transport
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; transportId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, transportId } = await params;

    const transport = await prisma.tripTransport.findFirst({
      where: {
        id: transportId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!transport) {
      return NextResponse.json({ error: "Transport not found" }, { status: 404 });
    }

    await prisma.tripTransport.delete({
      where: { id: transportId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transport:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

