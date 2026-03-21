import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { autoSeedIngredients } from "@/lib/seed-ingredients";
import { normalizeIngredientName } from "@/lib/name-normalization";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Auto-seed składników przy pierwszym użyciu
    await autoSeedIngredients(session.user.householdId);

    const searchTerm = query.trim();

    // 1. Pobierz produkty z inwentarza (PRIORYTET - użytkownik je ma!)
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        householdId: session.user.householdId,
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
        quantity: {
          gt: 0, // Tylko produkty które są dostępne
        },
      },
      include: {
        scannedProduct: true,
      },
      take: 5, // Max 5 z inwentarza
      orderBy: [
        { quantity: "desc" }, // Najpierw te których mamy więcej
        { name: "asc" },
      ],
    });

    // 2. Pobierz składniki z globalnej bazy
    const globalIngredients = await prisma.globalIngredient.findMany({
      where: {
        householdId: session.user.householdId,
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      take: 15, // Max 15 z bazy globalnej
      orderBy: [
        { usageCount: "desc" }, // Najpopularniejsze na górze
        { name: "asc" },
      ],
    });

    const inventoryNameKeys = new Set(
      inventoryItems.map((item) => normalizeIngredientName(item.name))
    );
    const seenGlobalKeys = new Set<string>();
    const dedupedGlobalIngredients = globalIngredients.filter((ingredient) => {
      const key = normalizeIngredientName(ingredient.name);
      if (inventoryNameKeys.has(key)) return false;
      if (seenGlobalKeys.has(key)) return false;
      seenGlobalKeys.add(key);
      return true;
    });

    // 3. Mapuj inwentarz do formatu sugestii (z flagą fromInventory)
    const inventorySuggestions = inventoryItems.map((item) => ({
      id: item.id,
      name: item.name,
      fromInventory: true,
      brand: item.brand,
      quantity: item.quantity,
      unit: item.unit,
      imageUrl: item.imageUrl,
      category: item.category,
      hasNutrition: !!item.nutritionData || !!item.scannedProduct,
      allergens: item.scannedProduct?.allergens || [],
      labels: item.scannedProduct?.labels || [],
    }));

    // 4. Mapuj składniki globalne do formatu sugestii
    const globalSuggestions = dedupedGlobalIngredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      fromInventory: false,
      category: ingredient.category,
      commonUnit: ingredient.commonUnit || "g",
      usageCount: ingredient.usageCount,
    }));

    // 5. Połącz: najpierw inwentarz, potem globalne
    const suggestions = [...inventorySuggestions, ...globalSuggestions];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error fetching ingredient suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

