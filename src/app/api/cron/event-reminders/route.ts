import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMinutes, isWithinInterval } from "date-fns";

// GET - sprawdź i wyślij przypomnienia o wydarzeniach
export async function GET(req: Request) {
  try {
    // Sprawdź token autoryzacji dla CRON
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results = {
      checked: 0,
      reminders: 0,
      errors: 0,
    };

    // Pobierz wydarzenia z przypomnieniami w ciągu najbliższych 24h
    const events = await prisma.event.findMany({
      where: {
        startDate: {
          gte: now,
          lte: addMinutes(now, 24 * 60), // 24 godziny
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
          start: addMinutes(reminderTime, -2),
          end: addMinutes(reminderTime, 2),
        });

        if (isTimeForReminder) {
          try {
            // Określ odbiorców
            const recipients = event.userId
              ? [{ id: event.userId, name: event.user?.name }]
              : event.household.members;

            // Stwórz powiadomienia dla każdego odbiorcy
            for (const recipient of recipients) {
              await prisma.notification.create({
                data: {
                  type: "EVENT_REMINDER",
                  title: `Przypomnienie: ${event.title}`,
                  message: formatReminderMessage(event.title, reminderMinute),
                  userId: recipient.id,
                  householdId: event.householdId,
                  link: "/calendar",
                },
              });
            }

            results.reminders++;
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

