import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - Dane do heatmap ruchu użytkownika
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const days = parseInt(searchParams.get("days") || "30"); // Domyślnie 30 dni

    // Data od
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Pobierz wszystkie wydarzenia geofencing
    const events = await prisma.geofenceEvent.findMany({
      where: {
        zone: {
          householdId: session.user.householdId,
        },
        ...(userId && { userId }),
        timestamp: {
          gte: startDate,
        },
        // Tylko wydarzenia z lokalizacją
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        latitude: true,
        longitude: true,
        timestamp: true,
        type: true,
      },
      orderBy: { timestamp: "desc" },
    });

    // Grupuj punkty według lokalizacji i zlicz intensywność
    const locationMap = new Map<string, { lat: number; lng: number; count: number }>();

    events.forEach((event) => {
      if (event.latitude === null || event.longitude === null) return;

      // Zaokrąglij do 4 miejsc po przecinku (około 11m precyzji)
      const lat = Math.round(event.latitude * 10000) / 10000;
      const lng = Math.round(event.longitude * 10000) / 10000;
      const key = `${lat},${lng}`;

      const existing = locationMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        locationMap.set(key, { lat, lng, count: 1 });
      }
    });

    // Konwertuj do array i normalizuj intensywność
    const locations = Array.from(locationMap.values());
    const maxCount = Math.max(...locations.map((l) => l.count), 1);

    const heatmapPoints = locations.map((loc) => ({
      latitude: loc.lat,
      longitude: loc.lng,
      intensity: loc.count / maxCount, // Znormalizowane 0-1
      count: loc.count, // Rzeczywista liczba
    }));

    return NextResponse.json({
      points: heatmapPoints,
      totalEvents: events.length,
      uniqueLocations: locations.length,
      maxCount,
      periodDays: days,
    });
  } catch (error) {
    console.error("Error generating heatmap data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

