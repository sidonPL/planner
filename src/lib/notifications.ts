import { buildInAppNotificationEmail, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

type NotificationType = 
  | "TASK_ASSIGNED" 
  | "TASK_REMINDER"
  | "TASK_COMPLETED"
  | "BUDGET_ALERT" 
  | "TRIP_REMINDER" 
  | "MEAL_REMINDER" 
  | "PRESENCE_UPDATE" 
  | "SYSTEM"
  | "BOARD_MESSAGE"
  | "PAYMENT_REMINDER"
  | "SHOPPING_REMINDER"
  | "SHOPPING_ASSIGNED"
  | "ACHIEVEMENT"
  | "EVENT_REMINDER"
  | "SCHEDULE_REMINDER";

interface CreateNotificationParams {
  userId: string;
  householdId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@planner.local";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

async function dispatchNotificationChannels({
  userId,
  title,
  message,
  link,
}: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      settings: true,
      pushSubscriptions: true,
    },
  });

  if (!user) return;

  const emailEnabled = user.settings?.emailEnabled === true;
  const pushEnabled = user.settings?.pushEnabled === true;

  if (emailEnabled && user.email) {
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const targetUrl = link ? `${appUrl}${link}` : appUrl;
    const emailHtml = buildInAppNotificationEmail({
      title,
      message,
      targetUrl,
    });

    await sendEmail({
      to: user.email,
      subject: `Powiadomienie: ${title}`,
      html: emailHtml,
    });
  }

  if (pushEnabled && vapidPublicKey && vapidPrivateKey && user.pushSubscriptions.length > 0) {
    const payload = {
      title,
      body: message,
      icon: "/icon-192x192.png",
      url: link || "/",
      tag: `planner-${Date.now()}`,
    };

    await Promise.allSettled(
      user.pushSubscriptions.map(async (sub) => {
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
        } catch (error: unknown) {
          if (error && typeof error === "object" && "statusCode" in error) {
            const statusCode = (error as { statusCode: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
          }
        }
      })
    );
  }
}

export async function createNotification({
  userId,
  householdId,
  title,
  message,
  type,
  link,
}: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      householdId,
      title,
      message,
      type,
      link,
    },
  });

  try {
    await dispatchNotificationChannels({
      userId,
      title,
      message,
      link,
    });
  } catch (error) {
    console.error("Notification channel dispatch failed:", error);
  }

  return notification;
}

// Powiadomienie o przypisaniu zadania
export async function notifyTaskAssigned(
  userId: string,
  householdId: string,
  taskTitle: string,
  taskId: string,
  assignedByName: string
) {
  return createNotification({
    userId,
    householdId,
    title: "Nowe zadanie",
    message: `${assignedByName} przypisał/a Ci zadanie: "${taskTitle}"`,
    type: "TASK_ASSIGNED",
    link: `/tasks?id=${taskId}`,
  });
}

// Powiadomienie o przypomnieniu zadania
export async function notifyTaskReminder(
  userId: string,
  householdId: string,
  taskTitle: string,
  taskId: string,
  dueDate: Date
) {
  const timeLeft = getTimeLeftString(dueDate);
  return createNotification({
    userId,
    householdId,
    title: "Przypomnienie o zadaniu",
    message: `Zadanie "${taskTitle}" - termin ${timeLeft}`,
    type: "TASK_REMINDER",
    link: `/tasks?id=${taskId}`,
  });
}

// Powiadomienie o przekroczeniu budżetu
export async function notifyBudgetAlert(
  userId: string,
  householdId: string,
  category: string,
  percentage: number
) {
  return createNotification({
    userId,
    householdId,
    title: "Alert budżetowy",
    message: `Wykorzystano ${percentage}% budżetu w kategorii "${category}"`,
    type: "BUDGET_ALERT",
    link: "/budget",
  });
}

// Powiadomienie o wyjeździe
export async function notifyTripReminder(
  userId: string,
  householdId: string,
  tripName: string,
  tripId: string,
  daysUntil: number
) {
  const message = daysUntil === 0
    ? `Wyjazd "${tripName}" rozpoczyna się dzisiaj!`
    : daysUntil === 1
    ? `Wyjazd "${tripName}" już jutro!`
    : `Wyjazd "${tripName}" za ${daysUntil} dni`;

  return createNotification({
    userId,
    householdId,
    title: "Przypomnienie o wyjeździe",
    message,
    type: "TRIP_REMINDER",
    link: `/trips?id=${tripId}`,
  });
}

// Powiadomienie o posiłku
export async function notifyMealReminder(
  userId: string,
  householdId: string,
  mealName: string,
  mealType: string
) {
  return createNotification({
    userId,
    householdId,
    title: `Czas na ${mealType.toLowerCase()}`,
    message: `Zaplanowany posiłek: ${mealName}`,
    type: "MEAL_REMINDER",
    link: "/meals",
  });
}

// Powiadomienie o zmianie obecności
export async function notifyPresenceChange(
  userId: string,
  householdId: string,
  memberName: string,
  status: "HOME" | "AWAY"
) {
  const message = status === "HOME"
    ? `${memberName} wrócił/a do domu`
    : `${memberName} wyszedł/wyszła`;

  return createNotification({
    userId,
    householdId,
    title: "Zmiana obecności",
    message,
    type: "PRESENCE_UPDATE",
    link: "/presence",
  });
}

// Helper - formatowanie czasu do terminu
function getTimeLeftString(dueDate: Date): string {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (diff < 0) return "przeterminowane";
  if (hours < 1) return "za mniej niż godzinę";
  if (hours < 24) return `za ${hours} godzin`;
  if (days === 1) return "jutro";
  return `za ${days} dni`;
}

