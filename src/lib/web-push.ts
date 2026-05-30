import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export const vapidPublicKey =
  process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
export const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
export const vapidSubject =
  process.env.VAPID_SUBJECT || process.env.NEXTAUTH_URL || "mailto:admin@planner.local";

let vapidConfigured = false;

export function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  if (!vapidPublicKey || !vapidPrivateKey) return false;
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  vapidConfigured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
  notificationId?: string;
  taskId?: string;
  requireInteraction?: boolean;
}

export function buildPushPayload(payload: PushPayload): string {
  const url = payload.url || "/";
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icon-192x192.png",
    badge: payload.badge || "/icon-96x96.png",
    url,
    tag: payload.tag || `planner-${Date.now()}`,
    actions: payload.actions || [],
    notificationId: payload.notificationId,
    taskId: payload.taskId,
    requireInteraction: payload.requireInteraction || false,
    data: {
      url,
      notificationId: payload.notificationId,
      taskId: payload.taskId,
    },
  });
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const body = buildPushPayload(payload);
  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          body
        );
        sent++;
      } catch (error: unknown) {
        failed++;
        if (error && typeof error === "object" && "statusCode" in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        }
      }
    })
  );

  return { sent, failed };
}

export function verifyCronAuth(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured — rejecting cron request");
    return false;
  }
  return authHeader === `Bearer ${cronSecret}`;
}
