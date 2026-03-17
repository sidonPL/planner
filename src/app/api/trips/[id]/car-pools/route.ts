import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const carPoolSchema = z.object({
  driverId: z.string(),
  seats: z.number().int().min(1),
  route: z.string().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
});

// GET - pobierz car pooling dla wyjazdu
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const carPools = await prisma.tripCarPool.findMany({
      where: {
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(carPools);
  } catch (error) {
    console.error("Error fetching car pools:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj car pool
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

    // Sprawdź czy trip istnieje i należy do tego household
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
    const validatedData = carPoolSchema.parse(body);

    const carPool = await prisma.tripCarPool.create({
      data: {
        tripId: id,
        ...validatedData,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(carPool);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating car pool:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
