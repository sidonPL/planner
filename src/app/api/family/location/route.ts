import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// POST - Aktualizuj lokalizację użytkownika
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude } = updateLocationSchema.parse(body);

    // Sprawdź czy użytkownik ma włączone udostępnianie
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { shareLocationWithFamily: true },
    });

    if (!user?.shareLocationWithFamily) {
      return NextResponse.json(
        { error: "Location sharing is disabled" },
        { status: 403 }
      );
    }

    // Aktualizuj lokalizację
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        lastKnownLatitude: latitude,
        lastKnownLongitude: longitude,
        lastLocationUpdate: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating location:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Pobierz lokalizacje członków rodziny
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pobierz wszystkich użytkowników gospodarstwa którzy udostępniają lokalizację
    const users = await prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
        shareLocationWithFamily: true,
        lastKnownLatitude: { not: null },
        lastKnownLongitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
        lastKnownLatitude: true,
        lastKnownLongitude: true,
        lastLocationUpdate: true,
      },
    });

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        color: user.color,
        latitude: user.lastKnownLatitude,
        longitude: user.lastKnownLongitude,
        lastUpdate: user.lastLocationUpdate,
      })),
    });
  } catch (error) {
    console.error("Error fetching family locations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

