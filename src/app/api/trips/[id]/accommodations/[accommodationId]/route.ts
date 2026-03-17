import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const accommodationSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").optional(),
  type: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  roomInfo: z.string().optional(),
  bookingRef: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

// PATCH - edytuj zakwaterowanie
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; accommodationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, accommodationId } = await params;

    const accommodation = await prisma.tripAccommodation.findFirst({
      where: {
        id: accommodationId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!accommodation) {
      return NextResponse.json({ error: "Accommodation not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = accommodationSchema.parse(body);

    const updated = await prisma.tripAccommodation.update({
      where: { id: accommodationId },
      data: {
        ...validatedData,
        checkIn: validatedData.checkIn ? new Date(validatedData.checkIn) : undefined,
        checkOut: validatedData.checkOut ? new Date(validatedData.checkOut) : undefined,
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
    console.error("Error updating accommodation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń zakwaterowanie
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; accommodationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, accommodationId } = await params;

    const accommodation = await prisma.tripAccommodation.findFirst({
      where: {
        id: accommodationId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!accommodation) {
      return NextResponse.json({ error: "Accommodation not found" }, { status: 404 });
    }

    await prisma.tripAccommodation.delete({
      where: { id: accommodationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting accommodation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

