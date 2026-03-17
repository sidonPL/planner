import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchGoogleCalendarEvents,
  convertGoogleEventToICalEvent,
  refreshAccessToken,
} from "@/lib/google-calendar";
import { parseEventFilter, matchesEventFilter } from "@/lib/event-filter";

// POST - Synchronizuj Google Calendar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: id,
        userId: session.user.id,
        type: "GOOGLE",
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
        // Odśwież token
        const newTokens = await refreshAccessToken(integration.refreshToken);
        accessToken = newTokens.access_token!;

        // Zaktualizuj w bazie
        await prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            accessToken,
            tokenExpiry: newTokens.expiry_date
              ? new Date(newTokens.expiry_date)
              : new Date(Date.now() + 3600 * 1000),
          },
        });
      }

      if (!accessToken) {
        throw new Error("No access token");
      }

      // Pobierz wydarzenia z ostatniego miesiąca
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1);

      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3);

      const googleEvents = await fetchGoogleCalendarEvents(
        accessToken,
        integration.calendarId,
        timeMin,
        timeMax
      );

      // Konwertuj wydarzenia
      let events = googleEvents.map(convertGoogleEventToICalEvent);

      // Filtrowanie (jeśli ustawione)
      if (integration.eventFilter) {
        const filterConfig = parseEventFilter(integration.eventFilter);
        if (filterConfig) {
          events = events.filter((event) => matchesEventFilter(event, filterConfig));
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
    console.error("Error syncing Google Calendar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

