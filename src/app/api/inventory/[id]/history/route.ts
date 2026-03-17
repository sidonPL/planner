import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    // Pobierz produkt
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Pobierz historię
    const history = await prisma.inventoryHistory.findMany({
      where: {
        inventoryItemId: id,
        householdId: session.user.householdId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    // Oblicz statystyki
    const stats = {
      totalChanges: history.length,
      totalAdded: history
        .filter(h => h.action === 'ADDED')
        .reduce((sum, h) => sum + (h.quantityChange || 0), 0),
      totalUsed: history
        .filter(h => h.action === 'USED')
        .reduce((sum, h) => sum + Math.abs(h.quantityChange || 0), 0),
      totalRemoved: history
        .filter(h => h.action === 'REMOVED')
        .reduce((sum, h) => sum + Math.abs(h.quantityChange || 0), 0),
      averageUsagePerWeek: 0, // Obliczone poniżej
    };

    // Oblicz średnie zużycie tygodniowe
    if (history.length > 0) {
      const oldestEntry = history[history.length - 1];
      const daysSinceFirstEntry = Math.max(
        1,
        (Date.now() - new Date(oldestEntry.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );
      const weeks = daysSinceFirstEntry / 7;
      stats.averageUsagePerWeek = stats.totalUsed / weeks;
    }

    // Predykcja wyczerpania (jeśli mamy średnią)
    let predictedDepletion: Date | null = null;
    if (stats.averageUsagePerWeek > 0 && item.quantity > 0) {
      const daysLeft = (item.quantity / (stats.averageUsagePerWeek / 7));
      predictedDepletion = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
    }

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      },
      history: history.map(h => ({
        id: h.id,
        action: h.action,
        quantityBefore: h.quantityBefore,
        quantityAfter: h.quantityAfter,
        quantityChange: h.quantityChange,
        unit: h.unit,
        source: h.source,
        notes: h.notes,
        timestamp: h.timestamp,
      })),
      stats,
      predictedDepletion,
    });
  } catch (error) {
    console.error("Error fetching inventory history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Dodaj wpis do historii
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, quantityChange, source, notes } = body;

    // Pobierz aktualny stan produktu
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const quantityBefore = item.quantity;
    const quantityAfter = quantityBefore + quantityChange;

    // Dodaj wpis do historii
    const historyEntry = await prisma.inventoryHistory.create({
      data: {
        inventoryItemId: id,
        itemName: item.name,
        action,
        quantityBefore,
        quantityAfter,
        quantityChange,
        unit: item.unit,
        source,
        notes,
        userId: session.user.id,
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json(historyEntry);
  } catch (error) {
    console.error("Error creating history entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

