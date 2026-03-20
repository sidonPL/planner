import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchICS, parseICS } from "@/lib/ical";

// Endpoint dla cron job - synchronizacja wszystkich aktywnych subskrypcji
export async function GET() {
  try {
    // Pobierz wszystkie aktywne subskrypcje URL
    const integrations = await prisma.calendarIntegration.findMany({
      where: {
        type: "ICAL_URL",
        isActive: true,
        icalUrl: { not: null },
      },
    });

    console.log(`[Calendar Sync] Found ${integrations.length} active subscriptions to sync`);

    const results = await Promise.allSettled(
      integrations.map((integration) => syncIntegration(integration))
    );

    const summary = {
      total: integrations.length,
      success: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
      timestamp: new Date().toISOString(),
    };

    console.log("[Calendar Sync] Summary:", summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[Calendar Sync] Fatal error:", error);
    return NextResponse.json(
      { error: "Calendar sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function syncIntegration(integration: { id: string; icalUrl: string | null; name: string | null }) {
  if (!integration.icalUrl) {
    throw new Error(`Integration ${integration.id} has no URL`);
  }

  console.log(`[Calendar Sync] Syncing: ${integration.name || integration.id}`);

  try {
    // 1. Pobierz .ics
    const icalData = await fetchICS(integration.icalUrl);

    // 2. Parsuj wydarzenia
    const events = parseICS(icalData);

    console.log(`[Calendar Sync] Found ${events.length} events in ${integration.name}`);

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

    // 4. Usuń wydarzenia które zniknęły
    const currentEventIds = events.map((e) => e.uid);
    const deleted = await prisma.calendarImportedEvent.deleteMany({
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

    console.log(
      `[Calendar Sync] ${integration.name}: SUCCESS - ${events.length} imported, ${deleted.count} deleted`
    );

    return {
      integrationId: integration.id,
      integrationName: integration.name,
      success: true,
      eventsImported: events.length,
      eventsDeleted: deleted.count,
    };
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

    console.error(`[Calendar Sync] ${integration.name}: ERROR - ${errorMessage}`);

    throw error;
  }
}

