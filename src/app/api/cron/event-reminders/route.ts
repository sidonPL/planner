import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/web-push";

import { addMinutes, isWithinInterval } from "date-fns";
import { createNotification } from "@/lib/notifications";


const REMINDER_LOOKAHEAD_MINUTES = 30 * 24 * 60; // do 30 dni do przodu
const REMINDER_WINDOW_MINUTES = 6; // zgodne z cron co 10 minut
const DEDUPE_WINDOW_MINUTES = 15;

// GET - sprawdź i wyślij przypomnienia o wydarzeniach
export async function GET(req: Request) {
  try {
    // Sprawdź token autoryzacji dla CRON
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const now = new Date();
    const results = {
      checked: 0,
      reminders: 0,
      errors: 0,
    };

    // Pobierz wydarzenia z przypomnieniami w horyzoncie odpowiadającym maksymalnym presetom
    const events = await prisma.event.findMany({
      where: {
        startDate: {
          gte: now,
          lte: addMinutes(now, REMINDER_LOOKAHEAD_MINUTES),
        },
        reminderMinutes: {
          isEmpty: false,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        household: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    results.checked = events.length;

    for (const event of events) {
      // Sprawdź każdy interwał przypomnienia
      for (const reminderMinute of event.reminderMinutes) {
        const reminderTime = addMinutes(event.startDate, -reminderMinute);

        // Sprawdź czy przypomnienie powinno być wysłane teraz (±2 minuty tolerancji)
        const isTimeForReminder = isWithinInterval(now, {
          start: addMinutes(reminderTime, -REMINDER_WINDOW_MINUTES),
          end: addMinutes(reminderTime, REMINDER_WINDOW_MINUTES),
        });

        if (isTimeForReminder) {
          try {
            // Określ odbiorców
            const recipients = event.userId
              ? [{ id: event.userId, name: event.user?.name }]
              : event.household.members;

            // Stwórz powiadomienia dla każdego odbiorcy (z ochroną przed duplikatami)
            for (const recipient of recipients) {
              const title = `Przypomnienie: ${event.title}`;
              const message = formatReminderMessage(event.title, reminderMinute);

              const existingNotification = await prisma.notification.findFirst({
                where: {
                  type: "EVENT_REMINDER",
                  userId: recipient.id,
                  title,
                  link: "/calendar",
                  createdAt: {
                    gte: addMinutes(now, -DEDUPE_WINDOW_MINUTES),
                  },
                },
              });

              if (existingNotification) {
                continue;
              }

              await createNotification({
                type: "EVENT_REMINDER",
                title,
                message,
                userId: recipient.id,
                householdId: event.householdId,
                link: "/calendar",
              });

              results.reminders++;
            }
          } catch (error) {
            console.error(`Error sending reminder for event ${event.id}:`, error);
            results.errors++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sprawdzono ${results.checked} wydarzeń, wysłano ${results.reminders} przypomnień`,
      results,
    });
  } catch (error) {
    console.error("Error in event-reminders:", error);
    return NextResponse.json(
      { error: "Failed to process event reminders" },
      { status: 500 }
    );
  }
}

function formatReminderMessage(title: string, minutesBefore: number): string {
  if (minutesBefore < 60) {
    return `Za ${minutesBefore} minut rozpoczyna się: ${title}`;
  } else if (minutesBefore < 24 * 60) {
    const hours = Math.floor(minutesBefore / 60);
    return `Za ${hours} ${hours === 1 ? "godzinę" : hours < 5 ? "godziny" : "godzin"} rozpoczyna się: ${title}`;
  } else {
    const days = Math.floor(minutesBefore / (24 * 60));
    return `Za ${days} ${days === 1 ? "dzień" : "dni"} rozpoczyna się: ${title}`;
  }
}

