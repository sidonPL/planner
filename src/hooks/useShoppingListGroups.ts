import { useMemo } from "react";

/**
 * Category mappings for auto-grouping shopping items
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Owoce i warzywa": [
    "jabłko", "banan", "pomarańcza", "gruszka", "truskawka", "malina", "cytryna",
    "pomidor", "ogórek", "sałata", "papryka", "cebula", "czosnek", "marchew",
    "ziemniak", "brokuł", "kalafior", "szpinak", "rukola", "awokado"
  ],
  "Nabiał": [
    "mleko", "ser", "jogurt", "masło", "śmietana", "kefir", "twaróg", "maślanka",
    "parmezan", "mozzarella", "feta", "camembert"
  ],
  "Mięso i wędliny": [
    "kurczak", "wołowina", "wieprzowina", "indyk", "szynka", "kiełbasa", "boczek",
    "salami", "mortadela", "mielone"
  ],
  "Pieczywo": [
    "chleb", "bułka", "bagietka", "pita", "tortilla", "kajzerka", "croissant"
  ],
  "Makarony i ryż": [
    "makaron", "spaghetti", "penne", "fusilli", "ryż", "kaszka", "orkisz", "quinoa"
  ],
  "Przyprawy": [
    "sól", "pieprz", "bazylia", "oregano", "tymianek", "rozmaryn", "papryka",
    "kurkuma", "cynamon", "gałka", "curry"
  ],
  "Przyprawy i dodatki": [
    "olej", "oliwa", "ocet", "sos", "ketchup", "musztarda", "majonez", "bulion"
  ],
  "Słodycze": [
    "czekolada", "cukier", "miód", "dżem", "nutella", "ciastka", "herbatniki"
  ],
  "Napoje": [
    "sok", "woda", "kawa", "herbata", "cola", "sprite", "piwo", "wino"
  ],
  "Inne": []
};

/**
 * Automatically detect category based on item name
 */
export function detectCategory(itemName: string): string {
  const lowerName = itemName.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }

  return "Inne";
}

/**
 * Group shopping items by category
 */
export function groupItemsByCategory<T extends { name: string; category?: string | null }>(
  items: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  items.forEach(item => {
    const category = item.category || detectCategory(item.name);
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  });

  return grouped;
}

/**
 * Hook to group and manage shopping list
 */
export function useShoppingListGroups<T extends { name: string; category?: string | null; isPurchased?: boolean }>(
  items: T[]
) {
  return useMemo(() => {
    // Separate purchased and unpurchased
    const unpurchased = items.filter(item => !item.isPurchased);
    const purchased = items.filter(item => item.isPurchased);

    // Group by category
    const groupedUnpurchased = groupItemsByCategory(unpurchased);
    const groupedPurchased = groupItemsByCategory(purchased);

    // Sort categories (predefined order)
    const categoryOrder = Object.keys(CATEGORY_KEYWORDS);
    const sortedCategories = Object.keys(groupedUnpurchased).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return {
      unpurchased,
      purchased,
      groupedUnpurchased,
      groupedPurchased,
      sortedCategories,
      totalItems: items.length,
      purchasedCount: purchased.length,
      progress: items.length > 0 ? (purchased.length / items.length) * 100 : 0,
    };
  }, [items]);
}

/**
 * Smart price tracking - detect patterns
 */
export function analyzeShoppingPrices<T extends { name: string; price?: number | null; store?: string | null }>(
  historicalData: T[]
): Record<string, { avgPrice: number; lowestPrice: number; bestStore: string | null }> {
  const analysis: Record<string, { avgPrice: number; lowestPrice: number; bestStore: string | null }> = {};

  const itemGroups: Record<string, T[]> = {};
  historicalData.forEach(item => {
    const key = item.name.toLowerCase();
    if (!itemGroups[key]) itemGroups[key] = [];
    itemGroups[key].push(item);
  });

  Object.entries(itemGroups).forEach(([name, items]) => {
    const validPrices = items.filter(i => i.price && i.price > 0);
    if (validPrices.length === 0) return;

    const avgPrice = validPrices.reduce((sum, i) => sum + (i.price || 0), 0) / validPrices.length;
    const lowestItem = validPrices.reduce((min, i) =>
      (i.price || Infinity) < (min.price || Infinity) ? i : min
    );

    analysis[name] = {
      avgPrice,
      lowestPrice: lowestItem.price || 0,
      bestStore: lowestItem.store || null,
    };
  });

  return analysis;
}

