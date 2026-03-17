import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchICS, parseICS } from "@/lib/ical";
import { parseEventFilter, matchesEventFilter } from "@/lib/event-filter";

// POST - Webhook od zewnętrznego serwisu kalendarza
export async function POST(request: NextRequest) {
  try {
    // Weryfikacja tokenu webhook (opcjonalne)
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, calendarUrl } = body;

    if (!integrationId) {
      return NextResponse.json({ error: "Integration ID required" }, { status: 400 });
    }

    // Pobierz integrację
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    // Użyj URL z webhook lub z integracji
    const icalUrl = calendarUrl || integration.icalUrl;

    if (!icalUrl) {
      return NextResponse.json({ error: "No calendar URL" }, { status: 400 });
    }

    try {
      // 1. Pobierz .ics
      const icalData = await fetchICS(icalUrl);

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
        integrationId: integration.id,
        timestamp: new Date().toISOString(),
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
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

