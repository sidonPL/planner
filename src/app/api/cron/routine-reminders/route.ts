import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import webpush from "web-push";

// Cron job - przypomnienia o rutynach o konkretnej godzinie
// Uruchamiany co godzinę przez zewnętrzny serwis (np. cron-job.org)
export async function GET(req: Request) {
  try {
    // Sprawdź authorization header (cron secret)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentTime = format(now, "HH:mm");

    console.log(`[Routine Reminders] Checking for routines at ${currentTime}`);

    // Znajdź rutyny z powiadomieniami na tę godzinę
    const tasks = await prisma.task.findMany({
      where: {
        isRecurring: true,
        dueTime: currentTime,
        status: {
          not: "COMPLETED" // Tylko nieukończone
        },
        assigneeId: {
          not: null
        }
      },
      include: {
        assignee: {
          include: {
            pushSubscriptions: true
          }
        },
        category: true,
      }
    });

    console.log(`[Routine Reminders] Found ${tasks.length} tasks to notify`);

    let sentCount = 0;

    // Wyślij powiadomienia
    for (const task of tasks) {
      if (!task.assignee || !task.assignee.pushSubscriptions.length) continue;

      for (const subscription of task.assignee.pushSubscriptions) {
        try {
          // Ustaw VAPID details
          webpush.setVapidDetails(
            process.env.NEXT_PUBLIC_APP_URL || "mailto:example@domain.com",
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            process.env.VAPID_PRIVATE_KEY!
          );

          const payload = JSON.stringify({
            title: "🔔 Czas na rutynę!",
            body: task.title,
            icon: "/icon-192x192.png",
            badge: "/icon-96x96.png",
            tag: `routine-${task.id}`,
            data: {
              taskId: task.id,
              url: `/tasks?filter=routines`,
              action: "open-task"
            },
            actions: [
              {
                action: "complete",
                title: "✅ Oznacz jako ukończone"
              },
              {
                action: "snooze",
                title: "⏰ Przypomnij za 15 min"
              }
            ]
          });

          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            },
            payload
          );

          sentCount++;
          console.log(`[Routine Reminders] Sent notification for task ${task.id} to user ${task.assignee?.name || 'unknown'}`);
        } catch (error) {
          console.error(`[Routine Reminders] Error sending notification:`, error);

          // Jeśli subskrypcja jest nieważna, usuń ją
          const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode: number }).statusCode : null;
          if (statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: subscription.id }
            });
            console.log(`[Routine Reminders] Removed invalid subscription ${subscription.id}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      time: currentTime,
      tasksFound: tasks.length,
      notificationsSent: sentCount
    });
  } catch (error) {
    console.error("[Routine Reminders] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


