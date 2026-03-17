import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLowStockItems } from "@/services/inventory";

// POST /api/inventory/add-low-stock-to-shopping - dodaj produkty o niskim stanie do zakupów
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Znajdź produkty z niskim stanem magazynowym
    const itemsToAdd = await getLowStockItems(session.user.householdId!);

    if (itemsToAdd.length === 0) {
      return NextResponse.json({ added: 0, message: "Brak produktów do uzupełnienia" });
    }

    // Sprawdź które produkty już są na liście zakupów
    const existingItems = await prisma.shoppingItem.findMany({
      where: {
        householdId: session.user.householdId!,
        isPurchased: false,
      },
    });

    const existingNames = new Set(existingItems.map((item) => item.name.toLowerCase()));

    // Dodaj tylko te, które nie są jeszcze na liście
    const newItems = itemsToAdd.filter(
      (item) => !existingNames.has(item.name.toLowerCase())
    );

    // Utwórz wpisy na liście zakupów
    const createdItems = await Promise.all(
      newItems.map((item) =>
        prisma.shoppingItem.create({
          data: {
            name: item.name,
            unit: item.unit,
            householdId: session.user.householdId!,
          },
        })
      )
    );

    return NextResponse.json({
      added: createdItems.length,
      skipped: itemsToAdd.length - createdItems.length,
      items: createdItems,
    });
  } catch (error) {
    console.error("Error adding low stock items to shopping:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

