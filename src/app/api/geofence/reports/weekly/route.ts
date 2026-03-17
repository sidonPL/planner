import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, differenceInMinutes } from "date-fns";
import { pl } from "date-fns/locale";

// GET - Raport tygodniowy obecności
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const weekStart = searchParams.get("weekStart");

    // Określ zakres tygodnia
    const baseDate = weekStart ? new Date(weekStart) : new Date();
    const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Poniedziałek
    const end = endOfWeek(baseDate, { weekStartsOn: 1 });

    // Pobierz wszystkich użytkowników gospodarstwa
    const users = await prisma.user.findMany({
      where: { householdId: session.user.householdId },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
      },
    });

    // Pobierz wszystkie strefy
    const zones = await prisma.geofenceZone.findMany({
      where: { householdId: session.user.householdId },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    // Pobierz wszystkie wydarzenia w tym tygodniu
    const events = await prisma.geofenceEvent.findMany({
      where: {
        zone: {
          householdId: session.user.householdId,
        },
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      include: {
        zone: true,
        user: true,
      },
      orderBy: { timestamp: "asc" },
    });

    // Generuj raport dla każdego użytkownika
    const userReports = users.map((user) => {
      const userEvents = events.filter((e) => e.userId === user.id);

      // Zlicz wejścia/wyjścia
      const totalEntries = userEvents.filter((e) => e.type === "ENTER").length;
      const totalExits = userEvents.filter((e) => e.type === "EXIT").length;

      // Zlicz wydarzenia per strefa
      const zoneStats = zones.map((zone) => {
        const zoneEvents = userEvents.filter((e) => e.zoneId === zone.id);
        const entries = zoneEvents.filter((e) => e.type === "ENTER");
        const exits = zoneEvents.filter((e) => e.type === "EXIT");

        // Oblicz całkowity czas spędzony w strefie
        let totalMinutes = 0;
        for (let i = 0; i < entries.length; i++) {
          const enter = entries[i];
          const exit = exits.find((e) => e.timestamp > enter.timestamp);
          if (exit) {
            totalMinutes += differenceInMinutes(exit.timestamp, enter.timestamp);
          }
        }

        return {
          zoneId: zone.id,
          zoneName: zone.name,
          zoneType: zone.type,
          entries: entries.length,
          exits: exits.length,
          totalMinutes,
          totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        };
      });

      // Statystyki dzienne
      const days = eachDayOfInterval({ start, end });
      const dailyStats = days.map((day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const dayEvents = userEvents.filter(
          (e) => e.timestamp >= dayStart && e.timestamp <= dayEnd
        );

        return {
          date: format(day, "yyyy-MM-dd"),
          dayName: format(day, "EEEE", { locale: pl }),
          totalEvents: dayEvents.length,
          entries: dayEvents.filter((e) => e.type === "ENTER").length,
          exits: dayEvents.filter((e) => e.type === "EXIT").length,
        };
      });

      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userColor: user.color,
        summary: {
          totalEntries,
          totalExits,
          totalEvents: userEvents.length,
        },
        zoneStats,
        dailyStats,
      };
    });

    // Podsumowanie całego gospodarstwa
    const householdSummary = {
      weekStart: format(start, "yyyy-MM-dd"),
      weekEnd: format(end, "yyyy-MM-dd"),
      weekLabel: `${format(start, "d MMM", { locale: pl })} - ${format(end, "d MMM yyyy", { locale: pl })}`,
      totalUsers: users.length,
      totalEvents: events.length,
      totalZones: zones.length,
    };

    return NextResponse.json({
      summary: householdSummary,
      userReports,
    });
  } catch (error) {
    console.error("Error generating weekly report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

