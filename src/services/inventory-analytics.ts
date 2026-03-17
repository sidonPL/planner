import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";

/**
 * Analiza trendów zużycia produktów
 */
export async function getInventoryConsumptionTrends(householdId: string) {
  // Pobierz historię zmian ilości produktów z ostatnich 3 miesięcy
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const items = await prisma.inventoryItem.findMany({
    where: {
      householdId,
      updatedAt: {
        gte: threeMonthsAgo,
      },
    },
    select: {
      name: true,
      quantity: true,
      unit: true,
      category: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // Grupuj po produktach i oblicz średnie zużycie
  const productTrends: Record<
    string,
    {
      name: string;
      category: string | null;
      unit: string | null;
      avgConsumptionPerWeek: number;
      timesRestocked: number;
      lastUpdated: Date;
    }
  > = {};

  items.forEach((item) => {
    const key = item.name.toLowerCase();
    if (!productTrends[key]) {
      productTrends[key] = {
        name: item.name,
        category: item.category,
        unit: item.unit,
        avgConsumptionPerWeek: 0,
        timesRestocked: 0,
        lastUpdated: item.updatedAt,
      };
    }
    productTrends[key].timesRestocked += 1;
  });

  return Object.values(productTrends).sort(
    (a, b) => b.timesRestocked - a.timesRestocked
  );
}

/**
 * Produkty zbliżające się do przeterminowania (następne 7 dni)
 */
export async function getExpiringSoonItems(householdId: string) {
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const items = await prisma.inventoryItem.findMany({
    where: {
      householdId,
      expiryDate: {
        gte: now,
        lte: sevenDaysFromNow,
      },
    },
    select: {
      id: true,
      name: true,
      quantity: true,
      unit: true,
      category: true,
      location: true,
      expiryDate: true,
    },
    orderBy: {
      expiryDate: "asc",
    },
  });

  return items.map((item) => ({
    ...item,
    daysUntilExpiry: item.expiryDate
      ? differenceInDays(item.expiryDate, now)
      : null,
  }));
}

/**
 * Produkty przeterminowane
 */
export async function getExpiredItems(householdId: string) {
  const now = new Date();

  const items = await prisma.inventoryItem.findMany({
    where: {
      householdId,
      expiryDate: {
        lt: now,
      },
    },
    select: {
      id: true,
      name: true,
      quantity: true,
      unit: true,
      category: true,
      location: true,
      expiryDate: true,
    },
    orderBy: {
      expiryDate: "asc",
    },
  });

  return items.map((item) => ({
    ...item,
    daysSinceExpiry: item.expiryDate
      ? Math.abs(differenceInDays(item.expiryDate, now))
      : null,
  }));
}

/**
 * Produkty o niskim stanie (poniżej minimalnej ilości)
 */
export async function getLowStockItems(householdId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: {
      householdId,
      minQuantity: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      quantity: true,
      minQuantity: true,
      unit: true,
      category: true,
      location: true,
      autoRestock: true,
    },
  });

  return items
    .filter((item) => item.minQuantity && item.quantity <= item.minQuantity)
    .map((item) => ({
      ...item,
      deficit: item.minQuantity ? item.minQuantity - item.quantity : 0,
    }))
    .sort((a, b) => b.deficit - a.deficit);
}

/**
 * Statystyki zapasów per kategoria
 */
export async function getInventoryStatsByCategory(householdId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: {
      householdId,
    },
    select: {
      category: true,
      quantity: true,
    },
  });

  const stats: Record<
    string,
    {
      itemCount: number;
      totalQuantity: number;
    }
  > = {};

  items.forEach((item) => {
    const category = item.category || "other";
    if (!stats[category]) {
      stats[category] = {
        itemCount: 0,
        totalQuantity: 0,
      };
    }
    stats[category].itemCount += 1;
    stats[category].totalQuantity += item.quantity;
  });

  return stats;
}

/**
 * Statystyki zapasów per lokalizacja
 */
export async function getInventoryStatsByLocation(householdId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: {
      householdId,
    },
    select: {
      location: true,
      quantity: true,
    },
  });

  const stats: Record<
    string,
    {
      itemCount: number;
      totalQuantity: number;
    }
  > = {};

  items.forEach((item) => {
    const location = item.location || "other";
    if (!stats[location]) {
      stats[location] = {
        itemCount: 0,
        totalQuantity: 0,
      };
    }
    stats[location].itemCount += 1;
    stats[location].totalQuantity += item.quantity;
  });

  return stats;
}

/**
 * Rekomendacje uzupełnienia zapasów na podstawie historii
 */
export async function getRestockRecommendations(householdId: string) {
  // Pobierz produkty o niskim stanie
  const lowStockItems = await getLowStockItems(householdId);

  // Sprawdź, które z nich nie są już na liście zakupów
  const shoppingList = await prisma.shoppingItem.findMany({
    where: {
      householdId,
      isPurchased: false,
    },
    select: {
      name: true,
    },
  });

  const shoppingListNames = new Set(
    shoppingList.map((item) => item.name.toLowerCase())
  );

  const recommendations = lowStockItems
    .filter((item) => !shoppingListNames.has(item.name.toLowerCase()))
    .map((item) => ({
      name: item.name,
      currentQuantity: item.quantity,
      minQuantity: item.minQuantity,
      suggestedQuantity: item.deficit,
      unit: item.unit,
      category: item.category,
      autoRestock: item.autoRestock,
    }));

  return recommendations;
}

