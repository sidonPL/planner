/**
 * Algorytm grupowania podobnych produktów
 * Używa Levenshtein distance do znajdowania podobnych nazw
 */

export interface ProductGroup {
  mainName: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string | null;
  }>;
  totalQuantity: number;
  similarity: number;
}

// Levenshtein distance - oblicza podobieństwo dwóch stringów
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}

// Oblicz similarity score (0-1, gdzie 1 = identyczne)
function getSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}

// Znajdź podobne produkty
export function findSimilarProducts(
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string | null;
  }>,
  threshold = 0.7 // 70% podobieństwa
): ProductGroup[] {
  const groups: ProductGroup[] = [];
  const processed = new Set<string>();

  items.forEach((item) => {
    if (processed.has(item.id)) return;

    const similar = items.filter((other) => {
      if (item.id === other.id || processed.has(other.id)) return false;
      const similarity = getSimilarity(item.name, other.name);
      return similarity >= threshold;
    });

    if (similar.length > 0) {
      const allItems = [item, ...similar];
      const totalQuantity = allItems.reduce((sum, i) => sum + i.quantity, 0);

      groups.push({
        mainName: item.name,
        items: allItems,
        totalQuantity,
        similarity: threshold,
      });

      allItems.forEach((i) => processed.add(i.id));
    }
  });

  return groups;
}

// Znajdź potencjalne zamienniki
export function findAlternatives(
  productName: string,
  allProducts: Array<{ name: string; category?: string | null }>
): Array<{ name: string; similarity: number }> {
  const alternatives = allProducts
    .filter((p) => p.name !== productName)
    .map((p) => ({
      name: p.name,
      similarity: getSimilarity(productName, p.name),
    }))
    .filter((p) => p.similarity > 0.5 && p.similarity < 0.95) // Podobne ale nie identyczne
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return alternatives;
}

// Sugeruj połączenie produktów
export function suggestMerge(
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string | null;
  }>
): Array<{
  suggested: string;
  items: string[];
  totalQuantity: number;
}> {
  const commonWords = ["mleko", "ser", "jogurt", "masło", "chleb", "jajka"];

  const suggestions: Array<{
    suggested: string;
    items: string[];
    totalQuantity: number;
  }> = [];

  commonWords.forEach((word) => {
    const matching = items.filter((item) =>
      item.name.toLowerCase().includes(word)
    );

    if (matching.length > 1) {
      suggestions.push({
        suggested: word.charAt(0).toUpperCase() + word.slice(1),
        items: matching.map((m) => m.name),
        totalQuantity: matching.reduce((sum, m) => sum + m.quantity, 0),
      });
    }
  });

  return suggestions;
}

