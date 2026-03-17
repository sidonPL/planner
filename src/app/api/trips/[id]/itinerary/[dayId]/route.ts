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
  date: z.string().transform(val => new Date(val)).optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  activities: z.array(itineraryActivitySchema).optional(),
});

// PATCH - zaktualizuj dzień
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, dayId } = await params;

    // Sprawdź czy dzień należy do wycieczki użytkownika
    const day = await prisma.tripItineraryDay.findFirst({
      where: {
        id: dayId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!day) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = itineraryDaySchema.parse(body);

    const { activities, ...dayData } = validatedData;

    // Jeśli są nowe aktywności, usuń stare i dodaj nowe
    const updatedDay = await prisma.tripItineraryDay.update({
      where: { id: dayId },
      data: {
        ...dayData,
        ...(activities && {
          activities: {
            deleteMany: {},
            create: activities,
          },
        }),
      },
      include: {
        activities: {
          orderBy: { time: "asc" },
        },
      },
    });

    return NextResponse.json(updatedDay);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating itinerary day:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń dzień
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, dayId } = await params;

    // Sprawdź czy dzień należy do wycieczki użytkownika
    const day = await prisma.tripItineraryDay.findFirst({
      where: {
        id: dayId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!day) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    await prisma.tripItineraryDay.delete({
      where: { id: dayId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting itinerary day:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

