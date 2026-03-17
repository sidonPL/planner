import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const carPoolUpdateSchema = z.object({
  passengers: z.array(z.string()).optional(),
  seats: z.number().int().min(1).optional(),
  route: z.string().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
});

// PATCH - aktualizuj car pool (np. dodaj pasażera)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; poolId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, poolId } = await params;

    const carPool = await prisma.tripCarPool.findFirst({
      where: {
        id: poolId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!carPool) {
      return NextResponse.json({ error: "Car pool not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = carPoolUpdateSchema.parse(body);

    const updated = await prisma.tripCarPool.update({
      where: { id: poolId },
      data: validatedData,
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

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating car pool:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń car pool
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; poolId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, poolId } = await params;

    const carPool = await prisma.tripCarPool.findFirst({
      where: {
        id: poolId,
        trip: {
          id,
          householdId: session.user.householdId,
        },
      },
    });

    if (!carPool) {
      return NextResponse.json({ error: "Car pool not found" }, { status: 404 });
    }

    await prisma.tripCarPool.delete({
      where: { id: poolId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting car pool:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
