import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { startOfDay, addDays, differenceInYears } from "date-fns";

const anniversaryTypeLabels: Record<string, string> = {
  WEDDING: "🎊 Rocznica ślubu",
  ENGAGEMENT: "💍 Rocznica zaręczyn",
  FIRST_DATE: "❤️ Rocznica pierwszej randki",
  MOVING: "🏡 Rocznica wprowadzenia",
  JOB_START: "💼 Rocznica rozpoczęcia pracy",
  GRADUATION: "🎓 Rocznica ukończenia studiów",
  OTHER: "🎉 Rocznica",
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    // Pobierz rocznice
    const anniversaries = await prisma.anniversary.findMany({
      include: {
        household: {
          include: {
            members: {
              select: {
                id: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const notifications: { anniversaryId: string; title: string; years: number }[] = [];

    for (const anniversary of anniversaries) {
      if (!anniversary.household) continue;

      const anniversaryDate = new Date(anniversary.date);
      const thisYearAnniversary = new Date(
        today.getFullYear(),
        anniversaryDate.getMonth(),
        anniversaryDate.getDate()
      );

      const isTodayAnniversary = thisYearAnniversary.getTime() === today.getTime();
      const isTomorrowAnniversary = thisYearAnniversary.getTime() === tomorrow.getTime();

      if (isTodayAnniversary || isTomorrowAnniversary) {
        const years = differenceInYears(today, anniversaryDate);
        const label = anniversaryTypeLabels[anniversary.type] || "🎉 Rocznica";
        const title = anniversary.title || label;

        const message = isTodayAnniversary
          ? `${label}: ${title} (${years} ${years === 1 ? "rok" : years < 5 ? "lata" : "lat"})`
          : `Jutro: ${label}: ${title} (${years} ${years === 1 ? "rok" : years < 5 ? "lata" : "lat"})`;

        // Wyślij powiadomienie do wszystkich członków gospodarstwa
        for (const member of anniversary.household.members) {
          // Sprawdź czy powiadomienie już nie zostało wysłane dzisiaj
          const existingNotification = await prisma.notification.findFirst({
            where: {
              userId: member.id,
              type: "SYSTEM",
              message,
              createdAt: {
                gte: today,
              },
            },
          });

          if (!existingNotification) {
            await createNotification({
              userId: member.id,
              householdId: anniversary.household.id,
              title: "Rocznica!",
              message,
              type: "SYSTEM",
              link: `/calendar`,
            });

            notifications.push({
              anniversaryId: anniversary.id,
              title,
              years,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wysłano ${notifications.length} powiadomień o rocznicach`,
      notifications,
    });
  } catch (error) {
    console.error("Błąd podczas generowania powiadomień o rocznicach:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować powiadomień" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

