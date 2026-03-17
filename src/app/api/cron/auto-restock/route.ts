import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - sprawdź i automatycznie uzupełnij zapasy które spadły poniżej progu
export async function GET(req: Request) {
  try {
    // Sprawdź token autoryzacji dla CRON
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Znajdź wszystkie produkty z włączonym auto-restock i ilością poniżej minimum
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        autoRestock: true,
        minQuantity: { not: null },
        // quantity <= minQuantity
      },
    });

    // Filtruj te, które są poniżej progu
    const itemsToRestock = lowStockItems.filter(
      (item) => item.minQuantity !== null && item.quantity <= item.minQuantity
    );

    const results = {
      checked: lowStockItems.length,
      restocked: 0,
      skipped: 0,
      errors: 0,
    };

    for (const item of itemsToRestock) {
      try {
        // Sprawdź czy produkt nie jest już na liście zakupów
        const existingShoppingItem = await prisma.shoppingItem.findFirst({
          where: {
            name: item.name,
            householdId: item.householdId,
            isPurchased: false,
          },
        });

        if (existingShoppingItem) {
          results.skipped++;
          continue;
        }

        // Dodaj do listy zakupów
        await prisma.shoppingItem.create({
          data: {
            name: `${item.name} (auto)`,
            quantity: item.minQuantity ? item.minQuantity * 2 : null, // Uzupełnij do podwójnej minimalnej ilości
            unit: item.unit,
            category: item.category,
            householdId: item.householdId,
          },
        });

        results.restocked++;
      } catch (error) {
        console.error(`Error restocking item ${item.name}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sprawdzono ${results.checked} produktów, dodano ${results.restocked} do listy zakupów`,
      results,
    });
  } catch (error) {
    console.error("Error in auto-restock:", error);
    return NextResponse.json(
      { error: "Failed to process auto-restock" },
      { status: 500 }
    );
  }
}

