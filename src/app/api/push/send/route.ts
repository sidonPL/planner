import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

// Skonfiguruj VAPID
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@planner.local";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
  notificationId?: string;
  taskId?: string;
  requireInteraction?: boolean;
}

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userId: string;
}

// POST - wyślij powiadomienie push do użytkownika
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { userId, title, message, url, tag, actions, notificationId, taskId } = body;

    // Jeśli nie podano userId, wyślij do aktualnego użytkownika
    const targetUserId = userId || session.user.id;

    // Pobierz subskrypcje użytkownika
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: targetUserId,
      },
    }) as PushSubscription[];

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: "No push subscriptions found for user" },
        { status: 404 }
      );
    }

    const payload: PushPayload = {
      title: title || "Planner",
      body: message || "Nowe powiadomienie",
      icon: "/icons/icon-192x192.png",
      url: url || "/",
      tag: tag || `planner-${Date.now()}`,
      actions: actions || [],
      notificationId,
      taskId,
    };

    // Wyślij powiadomienie do wszystkich subskrypcji użytkownika
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify(payload)
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (error: unknown) {
          // Jeśli subskrypcja wygasła, usuń ją
          if (error && typeof error === "object" && "statusCode" in error) {
            const statusCode = (error as { statusCode: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await prisma.pushSubscription.delete({
                where: { id: sub.id },
              });
            }
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r: PromiseSettledResult<unknown>) => r.status === "fulfilled").length;
    const failed = results.filter((r: PromiseSettledResult<unknown>) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}

