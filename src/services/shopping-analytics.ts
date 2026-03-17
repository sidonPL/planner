import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Statystyki zakupów per sklep
 */
export async function getShoppingStatsByStore(householdId: string) {
  const items = await prisma.shoppingItem.findMany({
    where: {
      householdId,
      isPurchased: true,
      store: { not: null },
    },
    select: {
      store: true,
      price: true,
      updatedAt: true,
    },
  });

  const statsByStore: Record<
    string,
    {
      totalSpent: number;
      itemCount: number;
      lastVisit: Date | null;
      avgPrice: number;
    }
  > = {};

  items.forEach((item) => {
    if (!item.store) return;

    if (!statsByStore[item.store]) {
      statsByStore[item.store] = {
        totalSpent: 0,
        itemCount: 0,
        lastVisit: null,
        avgPrice: 0,
      };
    }

    statsByStore[item.store].totalSpent += item.price || 0;
    statsByStore[item.store].itemCount += 1;

    if (
      item.updatedAt &&
      (!statsByStore[item.store].lastVisit ||
        item.updatedAt > statsByStore[item.store].lastVisit!)
    ) {
      statsByStore[item.store].lastVisit = item.updatedAt;
    }
  });

  // Oblicz średnią cenę
  Object.keys(statsByStore).forEach((store) => {
    const stats = statsByStore[store];
    stats.avgPrice = stats.itemCount > 0 ? stats.totalSpent / stats.itemCount : 0;
  });

  return statsByStore;
}

/**
 * Historia cen produktu
 */
export async function getProductPriceHistory(householdId: string, productName: string) {
  const items = await prisma.shoppingItem.findMany({
    where: {
      householdId,
      name: {
        contains: productName,
        mode: "insensitive",
      },
      isPurchased: true,
      price: { not: null },
    },
    select: {
      name: true,
      price: true,
      store: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 20,
  });

  return items;
}

/**
 * Częste produkty (dla szybkiego dodawania)
 */
export async function getFrequentProducts(householdId: string) {
  const items = await prisma.shoppingItem.findMany({
    where: {
      householdId,
    },
    select: {
      name: true,
      category: true,
      unit: true,
    },
  });

  // Zlicz wystąpienia
  const productCount: Record<
    string,
    {
      count: number;
      category: string | null;
      unit: string | null;
    }
  > = {};

  items.forEach((item) => {
    const key = item.name.toLowerCase();
    if (!productCount[key]) {
      productCount[key] = {
        count: 0,
        category: item.category,
        unit: item.unit,
      };
    }
    productCount[key].count += 1;
  });

  // Sortuj po częstości
  const sorted = Object.entries(productCount)
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return sorted;
}

/**
 * Rekomendacje produktów na podstawie historii
 */
export async function getProductRecommendations(householdId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Pobierz produkty często kupowane w ostatnich miesiącach
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentItems = await prisma.shoppingItem.findMany({
    where: {
      householdId,
      isPurchased: true,
      updatedAt: {
        gte: threeMonthsAgo,
      },
    },
    select: {
      name: true,
      category: true,
      unit: true,
      quantity: true,
    },
  });

  // Sprawdź, które produkty nie są obecnie na liście
  const currentList = await prisma.shoppingItem.findMany({
    where: {
      householdId,
      isPurchased: false,
    },
    select: {
      name: true,
    },
  });

  const currentListNames = new Set(
    currentList.map((item) => item.name.toLowerCase())
  );

  // Zlicz częstość i odfiltruj te, które są już na liście
  const productCount: Record<
    string,
    {
      count: number;
      category: string | null;
      unit: string | null;
      avgQuantity: number;
    }
  > = {};

  recentItems.forEach((item) => {
    const key = item.name.toLowerCase();
    if (currentListNames.has(key)) return; // Pomiń jeśli już na liście

    if (!productCount[key]) {
      productCount[key] = {
        count: 0,
        category: item.category,
        unit: item.unit,
        avgQuantity: 0,
      };
    }
    productCount[key].count += 1;
    productCount[key].avgQuantity += item.quantity || 0;
  });

  // Oblicz średnią ilość i sortuj
  const recommendations = Object.entries(productCount)
    .map(([name, data]) => ({
      name,
      category: data.category,
      unit: data.unit,
      avgQuantity: data.count > 0 ? data.avgQuantity / data.count : 1,
      frequency: data.count,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  return recommendations;
}

