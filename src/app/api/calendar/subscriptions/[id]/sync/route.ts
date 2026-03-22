import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchICS, parseICS } from "@/lib/ical";
import { parseEventFilter, matchesEventFilter } from "@/lib/event-filter";

// POST - Synchronizuj konkretną subskrypcję
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });
    const householdId = user?.householdId ?? null;

    const { id } = await params;

    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: id,
        userId: session.user.id,
        type: "ICAL_URL",
      },
    });

    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!integration.icalUrl) {
      return NextResponse.json({ error: "No URL configured" }, { status: 400 });
    }

    try {
      // 1. Pobierz .ics
      const icalData = await fetchICS(integration.icalUrl);

      // 2. Parsuj wydarzenia
      let events = parseICS(icalData);

      // 3. Filtrowanie wydarzeń (zaawansowane)
      if (integration.eventFilter) {
        const filterConfig = parseEventFilter(integration.eventFilter);
        if (filterConfig) {
          events = events.filter((event) => matchesEventFilter(event, filterConfig));
        }
      }

      // 4. Mapowanie kolorów (jeśli colorMapping jest ustawiony)
      const colorMap = new Map<string, string>();
      if (integration.colorMapping) {
        const mappings = integration.colorMapping.split(",").map((m) => m.trim());
        for (const mapping of mappings) {
          const [source, target] = mapping.split("=").map((c) => c.trim());
          if (source && target) {
            colorMap.set(source.toLowerCase(), target);
          }
        }
      }

      // 5. Upsert wydarzenia
      for (const event of events) {
        // Zmapuj kolor jeśli istnieje w mapowaniu
        let eventColor = event.color || null;
        if (eventColor && colorMap.has(eventColor.toLowerCase())) {
          eventColor = colorMap.get(eventColor.toLowerCase())!;
        }

        // Serializuj załączniki do JSON
        const attachmentsJson = event.attachments && event.attachments.length > 0
          ? JSON.stringify(event.attachments)
          : null;

        await prisma.calendarImportedEvent.upsert({
          where: {
            integrationId_externalId: {
              integrationId: integration.id,
              externalId: event.uid,
            },
          },
          create: {
            integrationId: integration.id,
            externalId: event.uid,
            householdId,
            title: event.summary,
            description: event.description,
            startDate: event.start,
            endDate: event.end,
            location: event.location,
            isAllDay: event.isAllDay,
            color: eventColor,
            attachments: attachmentsJson,
            rawIcal: event.raw,
          },
          update: {
            title: event.summary,
            description: event.description,
            startDate: event.start,
            endDate: event.end,
            location: event.location,
            isAllDay: event.isAllDay,
            color: eventColor,
            attachments: attachmentsJson,
            rawIcal: event.raw,
            householdId,
          },
        });
      }

      // 6. Usuń wydarzenia które zniknęły
      const currentEventIds = events.map((e) => e.uid);
      const deleted = await prisma.calendarImportedEvent.deleteMany({
        where: {
          integrationId: integration.id,
          externalId: { notIn: currentEventIds },
        },
      });

      // 7. Zaktualizuj status
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: {
          lastSync: new Date(),
          lastSyncStatus: "SUCCESS",
          lastSyncError: null,
        },
      });

      return NextResponse.json({
        success: true,
        eventsImported: events.length,
        eventsDeleted: deleted.count,
      });
    } catch (error) {
      // Zapisz błąd
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: {
          lastSync: new Date(),
          lastSyncStatus: "ERROR",
          lastSyncError: errorMessage,
        },
      });

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error("Error syncing integration:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

