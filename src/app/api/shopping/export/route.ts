import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - eksportuj listę zakupów jako tekst
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.shoppingItem.findMany({
      where: {
        householdId: session.user.householdId,
        isPurchased: false,
      },
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });

    // Grupowanie po kategoriach
    const categories = [
      { value: "fruits_vegetables", label: "Owoce i warzywa", emoji: "🥬" },
      { value: "dairy", label: "Nabiał", emoji: "🥛" },
      { value: "meat", label: "Mięso", emoji: "🥩" },
      { value: "bread", label: "Pieczywo", emoji: "🍞" },
      { value: "drinks", label: "Napoje", emoji: "🥤" },
      { value: "frozen", label: "Mrożonki", emoji: "🧊" },
      { value: "snacks", label: "Przekąski", emoji: "🍪" },
      { value: "cleaning", label: "Chemia", emoji: "🧹" },
      { value: "hygiene", label: "Higiena", emoji: "🧴" },
      { value: "other", label: "Inne", emoji: "📦" },
    ];

    const groupedItems = items.reduce((acc, item) => {
      const cat = item.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    // Tworzenie tekstu listy
    let exportText = "=== LISTA ZAKUPÓW ===\n\n";

    categories.forEach((cat) => {
      const categoryItems = groupedItems[cat.value];
      if (categoryItems && categoryItems.length > 0) {
        exportText += `${cat.emoji} ${cat.label}:\n`;
        categoryItems.forEach((item) => {
          const urgent = item.isUrgent ? " ⚠️" : "";
          const quantity = item.quantity && item.unit ? ` (${item.quantity} ${item.unit})` : "";
          exportText += `  ☐ ${item.name}${quantity}${urgent}\n`;
        });
        exportText += "\n";
      }
    });

    exportText += `\nŁącznie produktów: ${items.length}\n`;
    exportText += `Data: ${new Date().toLocaleDateString("pl-PL")}\n`;

    return new NextResponse(exportText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="lista-zakupow-${new Date().toISOString().split('T')[0]}.txt"`,
      },
    });
  } catch (error) {
    console.error("Error exporting shopping list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

