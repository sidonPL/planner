import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  householdId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

export async function createNotification({
  userId,
  householdId,
  title,
  message,
  type,
  link,
}: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId,
      householdId,
      title,
      message,
      type,
      link,
    },
  });
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

