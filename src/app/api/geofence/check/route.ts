import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";
import { calculateDistance } from "@/lib/geolocation";

const checkSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// POST - Sprawdź lokalizację i zaktualizuj status obecności
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude } = checkSchema.parse(body);

    // Pobierz aktywne strefy gospodarstwa
    const zones = await prisma.geofenceZone.findMany({
      where: {
        householdId: session.user.householdId,
        isActive: true,
      },
    });

    // Sprawdź w których strefach użytkownik się znajduje
    const activeZones = zones.filter((zone) => {
      const distance = calculateDistance(
        { latitude, longitude },
        { latitude: zone.latitude, longitude: zone.longitude }
      );
      return distance <= zone.radius;
    });

    // Pobierz ostatnie wydarzenie użytkownika dla każdej strefy
    const lastEvents = await Promise.all(
      zones.map((zone) =>
        prisma.geofenceEvent.findFirst({
          where: {
            zoneId: zone.id,
            userId: session.user.id,
          },
          orderBy: { timestamp: "desc" },
        })
      )
    );

    const lastEventsMap = new Map(
      lastEvents.filter((e) => e !== null).map((e) => [e!.zoneId, e!])
    );

    // Określ zmiany (wejścia/wyjścia)
    const newEvents: Array<{ zoneId: string; type: "ENTER" | "EXIT" }> = [];

    // Sprawdź nowe wejścia
    for (const zone of activeZones) {
      const lastEvent = lastEventsMap.get(zone.id);
      if (!lastEvent || lastEvent.type === "EXIT") {
        // Użytkownik wszedł do strefy
        newEvents.push({ zoneId: zone.id, type: "ENTER" });
      }
    }

    // Sprawdź wyjścia
    for (const zone of zones) {
      const lastEvent = lastEventsMap.get(zone.id);
      const isInZone = activeZones.some((z) => z.id === zone.id);

      if (lastEvent && lastEvent.type === "ENTER" && !isInZone) {
        // Użytkownik wyszedł ze strefy
        newEvents.push({ zoneId: zone.id, type: "EXIT" });
      }
    }

    // Zapisz nowe wydarzenia i wyślij powiadomienia
    let lastCreatedEvent = null;
    if (newEvents.length > 0) {
      const createdEvents = await Promise.all(
        newEvents.map((event) =>
          prisma.geofenceEvent.create({
            data: {
              zoneId: event.zoneId,
              userId: session.user.id,
              type: event.type,
              latitude,
              longitude,
            },
            include: {
              zone: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          })
        )
      );
      lastCreatedEvent = createdEvents[createdEvents.length - 1];

      // Wyślij powiadomienia do członków gospodarstwa (oprócz użytkownika)
      const householdMembers = await prisma.user.findMany({
        where: {
          householdId: session.user.householdId,
          id: { not: session.user.id }, // Nie powiadamiaj siebie
        },
        select: { id: true },
      });

      for (const event of createdEvents) {
        const zoneName = event.zone.name;
        const userName = event.user.name || "Ktoś";
        const emoji = event.type === "ENTER" ? "📍" : "🚶";
        const action = event.type === "ENTER" ? "wszedł/weszła do" : "wyszedł/wyszła z";

        const message = `${emoji} ${userName} ${action} strefy "${zoneName}"`;

        // Wyślij powiadomienie do każdego członka
        for (const member of householdMembers) {
          await createNotification({
            userId: member.id,
            householdId: session.user.householdId!,
            title: event.type === "ENTER" ? "Wejście do strefy" : "Wyjście ze strefy",
            message,
            type: "PRESENCE_UPDATE",
            link: "/family",
          });
        }
      }
    }

    // Zaktualizuj status obecności
    let presenceStatus: "HOME" | "AWAY" | "WORK" | "SCHOOL" = "AWAY";

    // Priorytet: HOME > WORK > SCHOOL > AWAY
    if (activeZones.some((z) => z.type === "HOME")) {
      presenceStatus = "HOME";
    } else if (activeZones.some((z) => z.type === "WORK")) {
      presenceStatus = "WORK";
    } else if (activeZones.some((z) => z.type === "SCHOOL")) {
      presenceStatus = "SCHOOL";
    }

    // Utwórz nowy rekord obecności jeśli status się zmienił
    const lastPresence = await prisma.presence.findFirst({
      where: { userId: session.user.id },
      orderBy: { timestamp: "desc" },
    });

    if (!lastPresence || lastPresence.status !== presenceStatus) {
      await prisma.presence.create({
        data: {
          userId: session.user.id,
          status: presenceStatus,
        },
      });
    }

    return NextResponse.json({
      activeZones: activeZones.map((z) => ({ id: z.id, name: z.name, type: z.type })),
      newEvents: newEvents.length,
      presenceStatus,
      statusChanged: !lastPresence || lastPresence.status !== presenceStatus,
      event: lastCreatedEvent,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error checking location:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

