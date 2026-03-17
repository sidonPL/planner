import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getInventoryItemById, updateInventoryItem, deleteInventoryItem } from "@/services/inventory";

// GET /api/inventory/[id] - pobierz pojedynczy produkt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const item = await getInventoryItemById(id, session.user.householdId!);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/inventory/[id] - aktualizuj produkt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, quantity, unit, category, location, expiryDate, minQuantity, autoRestock } = body;

    const item = await updateInventoryItem(
      id,
      {
        name,
        quantity,
        unit: unit || null,
        category: category || null,
        location: location || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        minQuantity: minQuantity || null,
        autoRestock: autoRestock ?? false,
      },
      session.user.householdId!
    );

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/inventory/[id] - usuń produkt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const success = await deleteInventoryItem(id, session.user.householdId!);

    if (!success) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }


    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

