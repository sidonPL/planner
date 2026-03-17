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

    // Pobierz wszystkie produkty z inwentarza
    const items = await prisma.inventoryItem.findMany({
      where: { householdId },
    });

    const suggestions: Array<{
      category: string;
      items: Array<{
        name: string;
        currentQuantity: number;
        suggestedQuantity: number;
        unit: string | null;
        reason: string;
        priority: "high" | "medium" | "low";
      }>;
    }> = [];

    // 1. Produkty z niskim stanem
    const lowStockItems = items.filter(
      (item) => item.minQuantity && item.quantity <= item.minQuantity
    );

    if (lowStockItems.length > 0) {
      suggestions.push({
        category: "Niskie zapasy",
        items: lowStockItems.map((item) => ({
          name: item.name,
          currentQuantity: item.quantity,
          suggestedQuantity: (item.minQuantity || 0) * 2,
          unit: item.unit,
          reason: `Zostało tylko ${item.quantity} ${item.unit}, minimum to ${item.minQuantity}`,
          priority: "high" as const,
        })),
      });
    }

    // 2. Produkty wygasające (użyj przed datą przydatności)
    const expiringSoon = items.filter((item) => {
      if (!item.expiryDate) return false;
      const days = differenceInDays(new Date(item.expiryDate), new Date());
      return days >= 0 && days <= 7;
    });

    if (expiringSoon.length > 0) {
      // Te produkty NIE powinny być kupowane (użyj je najpierw!)
      // Możemy dodać jako osobną kategorię z innym priorytetem
    }

    // 3. Produkty często używane (na podstawie historii)
    try {
      const history = await prisma.inventoryHistory.findMany({
        where: {
          householdId,
          action: "USED",
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // ostatnie 30 dni
          },
        },
        select: {
          itemName: true,
          quantityChange: true,
        },
      });

      // Agreguj użycie po nazwie produktu
      const usageStats = history.reduce((acc, entry) => {
        const name = entry.itemName;
        if (!acc[name]) {
          acc[name] = { totalUsed: 0, count: 0 };
        }
        acc[name].totalUsed += Math.abs(entry.quantityChange || 0);
        acc[name].count += 1;
        return acc;
      }, {} as Record<string, { totalUsed: number; count: number }>);

      // Znajdź często używane produkty które mają niski stan
      const frequentlyUsed = Object.entries(usageStats)
        .filter(([name, stats]) => stats.count >= 3) // używane minimum 3 razy
        .map(([name, stats]) => {
          const item = items.find((i) => i.name === name);
          if (!item) return null;

          // Oblicz średnie zużycie tygodniowe
          const weeklyAverage = (stats.totalUsed / 30) * 7;

          // Jeśli obecna ilość < 2 tygodnie zużycia, sugeruj zakup
          if (item.quantity < weeklyAverage * 2) {
            return {
              name: item.name,
              currentQuantity: item.quantity,
              suggestedQuantity: weeklyAverage * 4, // 4 tygodnie zapasu
              unit: item.unit,
              reason: `Często używany (~${weeklyAverage.toFixed(1)} ${item.unit}/tydzień)`,
              priority: "medium" as const,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (frequentlyUsed.length > 0) {
        suggestions.push({
          category: "Na podstawie historii użycia",
          items: frequentlyUsed as any,
        });
      }
    } catch (historyError) {
      // Historia może nie działać jeśli tabela jest pusta
      console.warn("Could not fetch history:", historyError);
    }

    // 4. Produkty do planowanych przepisów (przyszłość - TODO)
    // Można zintegrować z meal planem

    // Statystyki
    const totalSuggestions = suggestions.reduce((sum, cat) => sum + cat.items.length, 0);
    const highPriority = suggestions
      .flatMap((cat) => cat.items)
      .filter((item) => item.priority === "high").length;

    return NextResponse.json({
      suggestions,
      stats: {
        total: totalSuggestions,
        highPriority,
        mediumPriority: totalSuggestions - highPriority,
      },
      message:
        totalSuggestions > 0
          ? `Znaleziono ${totalSuggestions} sugestii zakupów`
          : "Wszystko w porządku! Brak pilnych zakupów.",
    });
  } catch (error) {
    console.error("Error generating shopping suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Dodaj produkty do listy zakupów
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body; // Array of { name, quantity, unit }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    // Dodaj wszystkie do shopping list
    const created = await prisma.shoppingItem.createMany({
      data: items.map((item: { name: string; quantity: number; unit: string | null }) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        householdId: session.user.householdId!,
        note: "Sugerowane przez asystenta zakupów",
      })),
    });
    return NextResponse.json({
      success: true,
      count: created.count,
      message: `Dodano ${created.count} produktów do listy zakupów`,
    });
  } catch (error) {
    console.error("Error adding to shopping list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

