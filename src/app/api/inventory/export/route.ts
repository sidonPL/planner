import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

type ImportInventoryItem = {
  name: string;
  quantity: string | number;
  unit?: string | null;
  category?: string | null;
  location?: string | null;
  expiryDate?: string | null;
  minQuantity?: string | number | null;
  price?: string | number | null;
  autoRestock?: boolean | string;
};

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get("format") || "csv";

    const items = await prisma.inventoryItem.findMany({
      where: {
        householdId: session.user.householdId,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    if (formatType === "csv") {
      // Generate CSV
      const headers = [
        "Nazwa",
        "Ilość",
        "Jednostka",
        "Kategoria",
        "Lokalizacja",
        "Data ważności",
        "Min. ilość",
        "Cena",
        "Auto-uzupełnianie",
      ];

      const rows = items.map((item) => [
        item.name,
        item.quantity.toString(),
        item.unit || "",
        item.category || "",
        item.location || "",
        item.expiryDate ? format(new Date(item.expiryDate), "yyyy-MM-dd") : "",
        item.minQuantity?.toString() || "",
        item.price?.toString() || "",
        item.autoRestock ? "Tak" : "Nie",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="inwentarz_${format(new Date(), "yyyy-MM-dd")}.csv"`,
        },
      });
    }

    // JSON format (for import/backup)
    if (formatType === "json") {
      const jsonContent = JSON.stringify(items, null, 2);

      return new NextResponse(jsonContent, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="inwentarz_${format(new Date(), "yyyy-MM-dd")}.json"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (error) {
    console.error("Error exporting inventory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Import from CSV/JSON
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      items?: ImportInventoryItem[];
      mode?: "add" | "replace";
    };
    const { items, mode = "add" } = body; // mode: 'add' or 'replace'

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    // If replace mode, delete all existing items
    if (mode === "replace") {
      await prisma.inventoryItem.deleteMany({
        where: {
          householdId: session.user.householdId,
        },
      });
    }

    // Add new items
    const created = await prisma.inventoryItem.createMany({
      data: items.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity) || 0,
        unit: item.unit || null,
        category: item.category || null,
        location: item.location || null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        minQuantity: item.minQuantity ? Number(item.minQuantity) : null,
        price: item.price ? Number(item.price) : null,
        autoRestock: item.autoRestock === true || item.autoRestock === "Tak",
        householdId: session.user.householdId!, // Non-null assertion - checked above
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      count: created.count,
      message: `Zaimportowano ${created.count} produktów`,
    });
  } catch (error) {
    console.error("Error importing inventory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

