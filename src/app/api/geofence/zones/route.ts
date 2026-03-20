import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const zoneSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(10).max(10000), // 10m - 10km
  type: z.enum(["HOME", "WORK", "SCHOOL", "OTHER"]),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// GET - Lista stref gospodarstwa
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const zones = await prisma.geofenceZone.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        _count: {
          select: { events: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(zones);
  } catch (error) {
    console.error("Error fetching zones:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Dodaj nową strefę
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = zoneSchema.parse(body);

    const zone = await prisma.geofenceZone.create({
      data: {
        ...data,
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json(zone, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating zone:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

