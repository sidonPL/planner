import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseICS } from "@/lib/ical";

// POST - Import wydarzeń z pliku .ics
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.householdId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const createIntegration = formData.get("createIntegration") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const icsContent = await file.text();

    // Parsuj .ics
    const events = parseICS(icsContent);

    if (events.length === 0) {
      return NextResponse.json({ error: "No events found in file" }, { status: 400 });
    }

    let integration = null;

    // Opcjonalnie utwórz integrację dla tego importu
    if (createIntegration) {
      integration = await prisma.calendarIntegration.create({
        data: {
          userId: session.user.id,
          type: "ICAL_UPLOAD",
          name: file.name.replace(/\.ics$/i, ""),
          isActive: false, // Upload nie jest aktywną subskrypcją
        },
      });
    }

    // Importuj wydarzenia
    const imported = [];
    for (const event of events) {
      try {
        if (integration) {
          // Zapisz jako zaimportowane wydarzenie
          const importedEvent = await prisma.calendarImportedEvent.create({
            data: {
              integrationId: integration.id,
              externalId: event.uid,
              householdId: session.user.householdId,
              title: event.summary,
              description: event.description,
              startDate: event.start,
              endDate: event.end,
              location: event.location,
              isAllDay: event.isAllDay,
              rawIcal: event.raw,
            },
          });
          imported.push(importedEvent);
        } else {
          // Utwórz bezpośrednio jako wydarzenie w kalendarzu
          const newEvent = await prisma.event.create({
            data: {
              householdId: session.user.householdId,
              userId: session.user.id,
              title: event.summary,
              description: event.description,
              startDate: event.start,
              endDate: event.end,
              location: event.location,
              allDay: event.isAllDay,
              type: "GENERAL",
            },
          });
          imported.push(newEvent);
        }
      } catch (error) {
        console.error("Error importing event:", error);
        // Kontynuuj z następnym wydarzeniem
      }
    }

    return NextResponse.json({
      success: true,
      eventsImported: imported.length,
      totalEvents: events.length,
      integrationId: integration?.id,
    });
  } catch (error) {
    console.error("Error importing calendar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

