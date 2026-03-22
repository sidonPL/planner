import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchMicrosoftCalendarEvents,
  convertMicrosoftEventToICalEvent,
  refreshMicrosoftToken,
} from "@/lib/microsoft-calendar";
import { parseEventFilter, matchesEventFilter } from "@/lib/event-filter";

type SyncedCalendarEvent = ReturnType<typeof convertMicrosoftEventToICalEvent>;

// POST - Synchronizuj Microsoft Outlook Calendar
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
        type: "OUTLOOK",
      },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    if (!integration.refreshToken || !integration.calendarId) {
      return NextResponse.json({ error: "Invalid integration" }, { status: 400 });
    }

    try {
      let accessToken = integration.accessToken;

      // Sprawdź czy token wygasł
      const now = new Date();
      if (integration.tokenExpiry && integration.tokenExpiry < now) {
        const newTokens = await refreshMicrosoftToken(integration.refreshToken);
        accessToken = newTokens.accessToken;

        await prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            accessToken,
            refreshToken: newTokens.refreshToken,
            tokenExpiry: newTokens.expiresOn || new Date(Date.now() + 3600 * 1000),
          },
        });
      }

      if (!accessToken) {
        throw new Error("No access token");
      }

      // Pobierz wydarzenia z ostatniego miesiąca + 3 miesiące naprzód
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const msEvents: unknown[] = await fetchMicrosoftCalendarEvents(
        accessToken,
        integration.calendarId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Konwertuj wydarzenia
      let events: SyncedCalendarEvent[] = msEvents.map((msEvent) =>
        convertMicrosoftEventToICalEvent(
          msEvent as Parameters<typeof convertMicrosoftEventToICalEvent>[0]
        )
      );

      // Filtrowanie
      if (integration.eventFilter) {
        const filterConfig = parseEventFilter(integration.eventFilter);
        if (filterConfig) {
          events = events.filter((event) =>
            matchesEventFilter(
              {
                summary: event.summary,
                description: event.description ?? undefined,
                location: event.location ?? undefined,
                categories: event.categories,
              },
              filterConfig
            )
          );
        }
      }

      // Mapowanie kolorów
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

      // Upsert wydarzenia
      for (const event of events) {
        let eventColor = event.color || null;
        if (eventColor && colorMap.has(eventColor.toLowerCase())) {
          eventColor = colorMap.get(eventColor.toLowerCase())!;
        }

        const attachmentsJson =
          event.attachments && event.attachments.length > 0
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
            householdId,
          },
        });
      }

      // Usuń stare wydarzenia
      const currentEventIds = events.map((e) => e.uid);
      await prisma.calendarImportedEvent.deleteMany({
        where: {
          integrationId: integration.id,
          externalId: { notIn: currentEventIds },
        },
      });

      // Zaktualizuj status
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
        lastSync: new Date(),
      });
    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : "Sync failed";

      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: {
          lastSync: new Date(),
          lastSyncStatus: "ERROR",
          lastSyncError: errorMessage,
        },
      });

      throw syncError;
    }
  } catch (error) {
    console.error("Error syncing Microsoft Calendar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

