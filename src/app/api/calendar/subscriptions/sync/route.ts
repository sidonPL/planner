import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchICS, parseICS } from "@/lib/ical";

// POST - Synchronizuj wszystkie aktywne subskrypcje
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await prisma.calendarIntegration.findMany({
      where: {
        userId: session.user.id,
        type: "ICAL_URL",
        isActive: true,
      },
    });

    const results = await Promise.allSettled(
      integrations.map((integration) => syncIntegration(integration.id))
    );

    const summary = {
      total: integrations.length,
      success: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error syncing integrations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function syncIntegration(integrationId: string) {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration || !integration.icalUrl) {
    throw new Error("Integration not found or missing URL");
  }

  try {
    // 1. Pobierz .ics
    const icalData = await fetchICS(integration.icalUrl);

    // 2. Parsuj wydarzenia
    const events = parseICS(icalData);

    // 3. Upsert wydarzenia
    for (const event of events) {
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
          rawIcal: event.raw,
        },
        update: {
          title: event.summary,
          description: event.description,
          startDate: event.start,
          endDate: event.end,
          location: event.location,
          isAllDay: event.isAllDay,
          rawIcal: event.raw,
        },
      });
    }

    // 4. Usuń wydarzenia które zniknęły z .ics
    const currentEventIds = events.map((e) => e.uid);
    await prisma.calendarImportedEvent.deleteMany({
      where: {
        integrationId: integration.id,
        externalId: { notIn: currentEventIds },
      },
    });

    // 5. Zaktualizuj status
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        lastSync: new Date(),
        lastSyncStatus: "SUCCESS",
        lastSyncError: null,
      },
    });

    return { integrationId, success: true, eventCount: events.length };
  } catch (error) {
    // Zapisz błąd
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        lastSync: new Date(),
        lastSyncStatus: "ERROR",
        lastSyncError: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}

