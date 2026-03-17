import { prisma } from "@/lib/prisma";

/**
 * Auto-tworzy event w kalendarzu dla wyjazdu
 */
export async function createTripEvent(tripId: string) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new Error("Trip not found");
    }

    // Sprawdź czy event już istnieje
    const existingEvent = await prisma.event.findFirst({
      where: {
        linkedTripId: tripId,
      },
    });

    if (existingEvent) {
      // Aktualizuj istniejący event
      return await prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          title: `🛫 ${trip.name}`,
          description: trip.description || `Wyjazd do ${trip.destination || "..."}`,
          startDate: trip.startDate,
          endDate: trip.endDate,
          allDay: true,
          type: "TRIP",
          location: trip.destination || undefined,
        },
      });
    }

    // Utwórz nowy event
    return await prisma.event.create({
      data: {
        title: `🛫 ${trip.name}`,
        description: trip.description || `Wyjazd do ${trip.destination || "..."}`,
        startDate: trip.startDate,
        endDate: trip.endDate,
        allDay: true,
        type: "TRIP",
        location: trip.destination || undefined,
        householdId: trip.householdId,
        linkedTripId: tripId,
        color: "#3B82F6", // Blue dla wyjazdów
        reminderMinutes: [10080, 1440], // 7 dni i 1 dzień przed
      },
    });
  } catch (error) {
    console.error("Error creating trip event:", error);
    throw error;
  }
}

/**
 * Usuwa event powiązany z wyjazdem
 */
export async function deleteTripEvent(tripId: string) {
  try {
    await prisma.event.deleteMany({
      where: {
        linkedTripId: tripId,
      },
    });
  } catch (error) {
    console.error("Error deleting trip event:", error);
    throw error;
  }
}

/**
 * Sprawdza przekroczenie budżetu i tworzy alert
 */
export async function checkBudgetAlert(tripId: string) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        expenses: true,
      },
    });

    if (!trip || !trip.plannedBudget) {
      return null;
    }

    const totalSpent = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const percentage = (totalSpent / trip.plannedBudget) * 100;

    // Alert przy 80% budżetu
    if (percentage >= 80 && percentage < 100) {
      return {
        type: "warning" as const,
        percentage,
        message: `⚠️ Wykorzystano ${percentage.toFixed(0)}% budżetu!`,
        totalSpent,
        plannedBudget: trip.plannedBudget,
      };
    }

    // Alert przy przekroczeniu
    if (percentage >= 100) {
      return {
        type: "danger" as const,
        percentage,
        message: `🚨 Przekroczono budżet o ${(totalSpent - trip.plannedBudget).toFixed(2)} ${trip.currency}!`,
        totalSpent,
        plannedBudget: trip.plannedBudget,
      };
    }

    return null;
  } catch (error) {
    console.error("Error checking budget alert:", error);
    return null;
  }
}
