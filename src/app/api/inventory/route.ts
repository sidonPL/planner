import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getInventoryItems, createInventoryItem } from "@/services/inventory";
import { triggerInventoryUpdate } from "@/lib/pusher-server";

// GET /api/inventory - pobierz wszystkie produkty
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await getInventoryItems(session.user.householdId!);

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/inventory - dodaj nowy produkt
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, quantity, unit, category, location, expiryDate, minQuantity, autoRestock } = body;

    if (!name || quantity === undefined) {
      return NextResponse.json(
        { error: "Name and quantity are required" },
        { status: 400 }
      );
    }

    const item = await createInventoryItem({
      name,
      quantity,
      unit: unit || null,
      category: category || null,
      location: location || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      minQuantity: minQuantity || null,
      autoRestock: autoRestock || false,
      householdId: session.user.householdId!,
    });

    // Real-time broadcast (opcjonalne - działa jeśli Pusher zainstalowany)
    await triggerInventoryUpdate(session.user.householdId!, "created", {
      item,
      userName: session.user.name || "Użytkownik",
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

