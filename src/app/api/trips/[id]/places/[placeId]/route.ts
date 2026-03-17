import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const placeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().transform(val => val === "" ? undefined : val),
  category: z.enum([
    "ATTRACTION",
    "RESTAURANT",
    "CAFE",
    "HOTEL",
    "BEACH",
    "MUSEUM",
    "PARK",
    "SHOPPING",
    "VIEWPOINT",
    "ENTERTAINMENT",
    "OTHER",
  ]).optional(),
  address: z.string().optional().transform(val => val === "" ? undefined : val),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  phoneNumber: z.string().optional().transform(val => val === "" ? undefined : val),
  openingHours: z.string().optional().transform(val => val === "" ? undefined : val),
  estimatedDuration: z.number().optional(),
  estimatedCost: z.number().optional(),
  visitDate: z.string().optional().transform(val => val === "" ? undefined : val),
  isVisited: z.boolean().optional(),
});

// PATCH - aktualizuj miejsce
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; placeId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, placeId } = await params;
    const body = await req.json();
    const validatedData = placeUpdateSchema.parse(body);

    // Sprawdź czy wyjazd należy do gospodarstwa użytkownika
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Sprawdź czy miejsce należy do tego wyjazdu
    const existingPlace = await prisma.tripPlace.findFirst({
      where: {
        id: placeId,
        tripId: id,
      },
    });

    if (!existingPlace) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const place = await prisma.tripPlace.update({
      where: { id: placeId },
      data: {
        ...validatedData,
        visitDate: validatedData.visitDate ? new Date(validatedData.visitDate) : undefined,
      },
    });

    return NextResponse.json(place);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error updating place:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń miejsce
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; placeId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, placeId } = await params;

    // Sprawdź czy wyjazd należy do gospodarstwa użytkownika
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Sprawdź czy miejsce należy do tego wyjazdu
    const existingPlace = await prisma.tripPlace.findFirst({
      where: {
        id: placeId,
        tripId: id,
      },
    });

    if (!existingPlace) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    await prisma.tripPlace.delete({
      where: { id: placeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting place:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

