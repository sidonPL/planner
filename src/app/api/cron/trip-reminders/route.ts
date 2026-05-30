// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\cron\trip-reminders\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/web-push";

import { notifyTripReminder } from "@/lib/notifications";

import { differenceInDays, startOfDay, addDays } from "date-fns";

// Ten endpoint może być wywoływany przez cron job (np. Vercel Cron, zewnętrzny cron)
// lub ręcznie w celu wygenerowania powiadomień o nadchodzących wyjazdach

export async function GET(request: NextRequest) {
  // Opcjonalnie: weryfikacja klucza API dla bezpieczeństwa
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = startOfDay(new Date());
    const in7Days = addDays(today, 7);

    // Pobierz wyjazdy, które zaczynają się dziś, jutro lub za tydzień
    const upcomingTrips = await prisma.trip.findMany({
      where: {
        status: "PLANNED",
        startDate: {
          gte: today,
          lte: in7Days,
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        household: {
          select: {
            id: true,
          },
        },
      },
    });

    const notifications: { tripId: string; userId: string; daysUntil: number }[] = [];

    for (const trip of upcomingTrips) {
      const daysUntil = differenceInDays(startOfDay(new Date(trip.startDate)), today);

      // Wysyłaj powiadomienia tylko dla: 7 dni, 1 dzień, 0 dni (dziś)
      if (daysUntil === 7 || daysUntil === 1 || daysUntil === 0) {
        // Sprawdź czy powiadomienie już nie zostało wysłane dzisiaj dla tego wyjazdu
        const existingNotification = await prisma.notification.findFirst({
          where: {
            link: `/trips?id=${trip.id}`,
            type: "TRIP_REMINDER",
            createdAt: {
              gte: today,
            },
          },
        });

        if (!existingNotification) {
          // Wyślij powiadomienie do wszystkich uczestników
          for (const participant of trip.participants) {
            await notifyTripReminder(
              participant.userId,
              trip.householdId,
              trip.name,
              trip.id,
              daysUntil
            );

            notifications.push({
              tripId: trip.id,
              userId: participant.userId,
              daysUntil,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wysłano ${notifications.length} powiadomień o wyjazdach`,
      notifications,
    });
  } catch (error) {
    console.error("Błąd podczas generowania powiadomień o wyjazdach:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować powiadomień" },
      { status: 500 }
    );
  }
}

// POST dla manualnego wywołania z panelu administracyjnego
export async function POST(request: NextRequest) {
  return GET(request);
}

