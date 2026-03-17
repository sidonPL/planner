import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

// GET - Eksport wydarzeń geofencing do CSV
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const zoneId = searchParams.get("zoneId");
    const formatType = searchParams.get("format") || "csv"; // csv lub json

    // Pobierz wydarzenia
    const events = await prisma.geofenceEvent.findMany({
      where: {
        zone: {
          householdId: session.user.householdId,
        },
        ...(userId && { userId }),
        ...(zoneId && { zoneId }),
        ...(startDate && endDate && {
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      include: {
        zone: {
          select: {
            name: true,
            type: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    if (formatType === "json") {
      // Export JSON
      return NextResponse.json(events);
    }

    // Export CSV
    const csvHeader = "Data,Godzina,Użytkownik,Email,Wydarzenie,Strefa,Typ strefy,Szerokość,Długość\n";
    const csvRows = events.map((event) => {
      const date = format(new Date(event.timestamp), "yyyy-MM-dd", { locale: pl });
      const time = format(new Date(event.timestamp), "HH:mm:ss", { locale: pl });
      const userName = event.user.name || "Nieznany";
      const userEmail = event.user.email || "";
      const eventType = event.type === "ENTER" ? "Wejście" : "Wyjście";
      const zoneName = event.zone.name;
      const zoneType = event.zone.type;
      const lat = event.latitude || "";
      const lng = event.longitude || "";

      return `${date},${time},"${userName}","${userEmail}",${eventType},"${zoneName}",${zoneType},${lat},${lng}`;
    });

    const csv = csvHeader + csvRows.join("\n");

    // Zwróć plik CSV
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="geofence-export-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting geofence data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

