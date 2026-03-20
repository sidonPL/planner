import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const householdId = session.user.householdId;

    // Pobierz wszystkie produkty
    const items = await prisma.inventoryItem.findMany({
      where: { householdId },
    });

    // Podstawowe statystyki
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => {
      const value = (item.price || 0) * item.quantity;
      return sum + value;
    }, 0);

    // Produkty niskowartościowe
    const lowStock = items.filter(
      (item) => item.minQuantity && item.quantity <= item.minQuantity
    );

    // Produkty wygasające
    const expiringSoon = items.filter((item) => {
      if (!item.expiryDate) return false;
      const days = differenceInDays(new Date(item.expiryDate), new Date());
      return days >= 0 && days <= 7;
    });

    // Produkty przeterminowane
    const expired = items.filter(
      (item) => item.expiryDate && new Date(item.expiryDate) < new Date()
    );

    // Top kategorie (po liczbie produktów)
    const categoryStats = items.reduce((acc, item) => {
      const cat = item.category || "other";
      if (!acc[cat]) {
        acc[cat] = { count: 0, value: 0 };
      }
      acc[cat].count++;
      acc[cat].value += (item.price || 0) * item.quantity;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const topCategories = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        value: stats.value,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top lokalizacje
    const locationStats = items.reduce((acc, item) => {
      const loc = item.location || "other";
      if (!acc[loc]) {
        acc[loc] = { count: 0, value: 0 };
      }
      acc[loc].count++;
      acc[loc].value += (item.price || 0) * item.quantity;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const topLocations = Object.entries(locationStats)
      .map(([location, stats]) => ({
        location,
        count: stats.count,
        value: stats.value,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Najbardziej wartościowe produkty
    const valuableItems = items
      .filter((item) => item.price && item.price > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        totalValue: (item.price || 0) * item.quantity,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Insights i rekomendacje
    const insights = [];

    if (lowStock.length > 0) {
      insights.push({
        type: "warning",
        title: "Niskie zapasy",
        message: `${lowStock.length} produktów wymaga uzupełnienia`,
        action: "add-to-shopping",
      });
    }

    if (expiringSoon.length > 0) {
      insights.push({
        type: "alert",
        title: "Wygasają wkrótce",
        message: `${expiringSoon.length} produktów wygasa w ciągu 7 dni`,
        action: "view-expiring",
      });
    }

    if (expired.length > 0) {
      insights.push({
        type: "error",
        title: "Przeterminowane",
        message: `${expired.length} produktów jest przeterminowanych`,
        action: "remove-expired",
      });
    }

    const avgItemsPerCategory = totalItems / Object.keys(categoryStats).length;
    const overloadedCategories = Object.entries(categoryStats)
      .filter(([, stats]) => stats.count > avgItemsPerCategory * 1.5)
      .map(([cat]) => cat);

    if (overloadedCategories.length > 0) {
      insights.push({
        type: "info",
        title: "Przepełnione kategorie",
        message: `Kategorie ${overloadedCategories.join(", ")} mają dużo produktów. Rozważ uporządkowanie.`,
        action: null,
      });
    }

    return NextResponse.json({
      summary: {
        totalItems,
        totalValue: parseFloat(totalValue.toFixed(2)),
        lowStockCount: lowStock.length,
        expiringSoonCount: expiringSoon.length,
        expiredCount: expired.length,
      },
      topCategories,
      topLocations,
      valuableItems,
      insights,
      lowStockItems: lowStock.slice(0, 5).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        unit: item.unit,
      })),
      expiringItems: expiringSoon.slice(0, 5).map((item) => ({
        id: item.id,
        name: item.name,
        expiryDate: item.expiryDate,
        daysLeft: differenceInDays(new Date(item.expiryDate!), new Date()),
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

