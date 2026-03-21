import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

/**
 * Endpoint do procesowania cyklicznych przypomnień
 * Wywoływany automatycznie przez cron job
 * 
 * Odnawia przeminięte cykliczne przypomnienia na nowy termin
 */
export async function POST(req: Request) {
  try {
    // Zabezpieczenie - sprawdzenie autoryzacji
    const authHeader = req.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Pobierz wszystkie zaległe cykliczne przypomnienia
    const overdueRecurringReminders = await prisma.paymentReminder.findMany({
      where: {
        recurring: true,
        isPaid: true, // Znaleź już opłacone cykliczne
        dueDate: {
          lt: now, // Które są przeminięte
        },
      },
      include: {
        household: true,
      },
    });

    let processedCount = 0;

    for (const reminder of overdueRecurringReminders) {
      try {
        // Oblicz nową datę na podstawie wzoru powtarzania
        let newDueDate: Date;

        switch (reminder.recurrencePattern) {
          case "DAILY":
            newDueDate = addDays(reminder.dueDate, 1);
            break;
          case "WEEKLY":
            newDueDate = addWeeks(reminder.dueDate, 1);
            break;
          case "MONTHLY":
            newDueDate = addMonths(reminder.dueDate, 1);
            break;
          case "YEARLY":
            newDueDate = addYears(reminder.dueDate, 1);
            break;
          default:
            continue;
        }

        // Jeśli nowa data jest jeszcze w przeszłości, pomiń
        if (newDueDate <= now) {
          continue;
        }

        // Zaktualizuj przypomnienie
        await prisma.paymentReminder.update({
          where: { id: reminder.id },
          data: {
            dueDate: newDueDate,
            isPaid: false, // Zmień na niepłacone
          },
        });

        // Wyślij powiadomienia do członków gospodarstwa
        const members = await prisma.user.findMany({
          where: { householdId: reminder.householdId },
          select: { id: true },
        });

        for (const member of members) {
          await createNotification({
            userId: member.id,
            householdId: reminder.householdId,
            title: `Powtórne przypomnienie: ${reminder.title}`,
            message: `Płatność ${reminder.amount} zł za "${reminder.title}" na dzień ${newDueDate.toLocaleDateString()}`,
            type: "PAYMENT_REMINDER",
            link: "/budget",
          });
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount,
      message: `Processed ${processedCount} recurring reminders`,
    });
  } catch (error) {
    console.error("Error in recurring reminders processor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


