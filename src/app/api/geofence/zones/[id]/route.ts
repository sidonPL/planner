import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().min(10).max(10000).optional(),
  type: z.enum(["HOME", "WORK", "SCHOOL", "OTHER"]).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET - Szczegóły strefy z historią wydarzeń
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const zone = await prisma.geofenceZone.findFirst({
      where: {
        id: id,
        householdId: session.user.householdId,
      },
      include: {
        events: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
          orderBy: { timestamp: "desc" },
          take: 50,
        },
        _count: {
          select: { events: true },
        },
      },
    });

    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json(zone);
  } catch (error) {
    console.error("Error fetching zone:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Aktualizuj strefę
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const zone = await prisma.geofenceZone.updateMany({
      where: {
        id: id,
        householdId: session.user.householdId,
      },
      data,
    });

    if (zone.count === 0) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating zone:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Usuń strefę
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const zone = await prisma.geofenceZone.deleteMany({
      where: {
        id: id,
        householdId: session.user.householdId,
      },
    });

    if (zone.count === 0) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting zone:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

