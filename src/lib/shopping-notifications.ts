import { prisma } from "@/lib/prisma";

/**
 * Wysyła powiadomienie o przypisaniu produktu do zakupów
 */
export async function sendShoppingAssignmentNotification(
  userId: string,
  itemName: string,
  assignedByUserId: string,
  householdId: string
) {
  try {
    // Nie wysyłaj powiadomienia jeśli użytkownik przypisał sam sobie
    if (userId === assignedByUserId) {
      return;
    }

    const assignedBy = await prisma.user.findUnique({
      where: { id: assignedByUserId },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        userId,
        householdId,
        type: "SHOPPING_ASSIGNED",
        title: "Nowy produkt na Twojej liście",
        message: `${assignedBy?.name || "Ktoś"} przypisał Ci produkt: ${itemName}`,
        link: "/shopping",
      },
    });
  } catch (error) {
    console.error("Error sending shopping assignment notification:", error);
    // Nie blokuj operacji jeśli notification się nie powiedzie
  }
}

/**
 * Wysyła powiadomienie o bulk przypisaniu
 */
export async function sendBulkShoppingAssignmentNotification(
  userId: string,
  itemsCount: number,
  assignedByUserId: string,
  householdId: string
) {
  try {
    if (userId === assignedByUserId) {
      return;
    }

    const assignedBy = await prisma.user.findUnique({
      where: { id: assignedByUserId },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        userId,
        householdId,
        type: "SHOPPING_ASSIGNED",
        title: "Nowe produkty na Twojej liście",
        message: `${assignedBy?.name || "Ktoś"} przypisał Ci ${itemsCount} produktów do kupienia`,
        link: "/shopping",
      },
    });
  } catch (error) {
    console.error("Error sending bulk assignment notification:", error);
  }
}

