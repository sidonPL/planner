/**
 * System automatycznego kategoryzowania transakcji
 * Analizuje opis transakcji i sugeruje odpowiednią kategorię
 */

interface CategoryRule {
  category: string;
  keywords: string[];
  patterns?: RegExp[];
  priority: number; // wyższy = ważniejszy
}

// Reguły kategoryzacji dla wydatków
const expenseRules: CategoryRule[] = [
  // Jedzenie - najwyższy priorytet dla marketów
  {
    category: "food",
    keywords: [
      "biedronka", "lidl", "kaufland", "carrefour", "auchan", "tesco",
      "żabka", "zabka", "fresh", "delikatesy", "sklep spożywczy",
      "market", "piekarnia", "cukiernia", "pizzeria", "restauracja",
      "mcdonalds", "kfc", "burger king", "subway", "pizza hut",
      "starbucks", "costa coffee", "kebab", "bar mleczny",
      "uber eats", "glovo", "pyszne.pl", "foodpanda"
    ],
    priority: 10,
  },
  // Transport
  {
    category: "transport",
    keywords: [
      "orlen", "bp", "shell", "circle k", "lotos", "benzyna", "paliwo",
      "uber", "bolt", "taxi", "mytaxi", "free now",
      "pkp", "koleje", "bilet", "mpk", "ztm", "komunikacja miejska",
      "parking", "autopay", "parkometer", "myjnia", "warsztat",
      "mechanik", "opony", "przegląd", "oc", "ac"
    ],
    priority: 9,
  },
  // Rachunki
  {
    category: "bills",
    keywords: [
      "pge", "tauron", "enea", "energa", "prąd", "energia", "gaz",
      "orange", "play", "plus", "t-mobile", "telefon", "internet",
      "netflix", "spotify", "hbo", "amazon prime", "youtube premium",
      "czynsz", "kredyt", "rata", "leasing", "ubezpieczenie",
      "pzu", "warta", "ergo", "allianz", "generali"
    ],
    priority: 10,
  },
  // Rozrywka
  {
    category: "entertainment",
    keywords: [
      "kino", "cinema", "multikino", "helios", "imax",
      "teatr", "opera", "filharmonia", "koncert", "festival",
      "steam", "playstation", "xbox", "nintendo", "gog",
      "spotify", "tidal", "apple music", "deezer",
      "siłownia", "fitness", "gym", "basen", "aquapark"
    ],
    priority: 8,
  },
  // Zakupy
  {
    category: "shopping",
    keywords: [
      "allegro", "amazon", "aliexpress", "zalando", "h&m", "zara",
      "reserved", "mohito", "cropp", "house", "sinsay",
      "empik", "media expert", "rtv euro agd", "x-kom",
      "ikea", "leroy merlin", "castorama", "obi",
      "rossmann", "hebe", "sephora", "douglas"
    ],
    priority: 7,
  },
  // Zdrowie
  {
    category: "health",
    keywords: [
      "apteka", "pharmacy", "lekarz", "dentysta", "przychodnia",
      "szpital", "klinika", "nfz", "luxmed", "medicover",
      "enel-med", "damian", "badania", "rtg", "usg",
      "rehabilitacja", "fizjoterapeuta", "psycholog"
    ],
    priority: 9,
  },
  // Dom
  {
    category: "home",
    keywords: [
      "meble", "agd", "rtv", "dekoracje", "wyposażenie",
      "remont", "budowa", "materiały budowlane",
      "hydraulik", "elektryk", "ślusarz", "malarz",
      "sprzątanie", "pranie", "chemical", "domestos"
    ],
    priority: 6,
  },
];

// Reguły kategoryzacji dla przychodów
const incomeRules: CategoryRule[] = [
  {
    category: "salary",
    keywords: [
      "wynagrodzenie", "pensja", "płaca", "salary", "wypłata",
      "przelew płacowy", "transfer płacowy"
    ],
    priority: 10,
  },
  {
    category: "bonus",
    keywords: [
      "premia", "bonus", "nagroda", "dodatek", "prowizja"
    ],
    priority: 9,
  },
  {
    category: "freelance",
    keywords: [
      "faktura", "zlecenie", "projekt", "honorarium",
      "umowa zlecenie", "umowa o dzieło", "b2b"
    ],
    priority: 8,
  },
  {
    category: "gift",
    keywords: [
      "prezent", "gift", "darowizna", "zwrot", "refund"
    ],
    priority: 7,
  },
];

/**
 * Normalizuje tekst do porównania
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // usuń diakrytyki
    .replace(/ł/g, "l")
    .trim();
}

/**
 * Sugeruje kategorię na podstawie opisu transakcji
 */
export function suggestCategory(
  description: string,
  type: "INCOME" | "EXPENSE"
): string | null {
  if (!description) return null;

  const normalizedDesc = normalizeText(description);
  const rules = type === "INCOME" ? incomeRules : expenseRules;

  let bestMatch: { category: string; priority: number; score: number } | null = null;

  for (const rule of rules) {
    let matchScore = 0;

    // Sprawdź słowa kluczowe
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeText(keyword);

      // Dokładne dopasowanie (cały wyraz)
      const exactMatch = new RegExp(`\\b${normalizedKeyword}\\b`, "i").test(normalizedDesc);
      if (exactMatch) {
        matchScore += 10;
      }
      // Częściowe dopasowanie
      else if (normalizedDesc.includes(normalizedKeyword)) {
        matchScore += 5;
      }
    }

    // Sprawdź wzorce regex (jeśli są)
    if (rule.patterns) {
      for (const pattern of rule.patterns) {
        if (pattern.test(description)) {
          matchScore += 15;
        }
      }
    }

    // Uwzględnij priorytet reguły
    const totalScore = matchScore * rule.priority;

    if (totalScore > 0) {
      if (!bestMatch || totalScore > bestMatch.score) {
        bestMatch = {
          category: rule.category,
          priority: rule.priority,
          score: totalScore,
        };
      }
    }
  }

  return bestMatch ? bestMatch.category : null;
}

/**
 * Kategoryzuje wiele transakcji jednocześnie
 */
export function batchCategorize(
  transactions: Array<{
    description: string;
    type: "INCOME" | "EXPENSE";
  }>
): Array<string | null> {
  return transactions.map((t) => suggestCategory(t.description, t.type));
}

/**
 * Dodaje nową regułę kategoryzacji (personalizacja)
 */
export function addCustomRule(
  category: string,
  keywords: string[],
  type: "INCOME" | "EXPENSE",
  priority: number = 5
): void {
  const rules = type === "INCOME" ? incomeRules : expenseRules;

  const existingRule = rules.find((r) => r.category === category);
  if (existingRule) {
    // Dodaj nowe słowa kluczowe do istniejącej reguły
    existingRule.keywords.push(...keywords);
  } else {
    // Utwórz nową regułę
    rules.push({
      category,
      keywords,
      priority,
    });
  }
}

/**
 * Zwraca statystyki skuteczności kategoryzacji
 */
export function getCategorizationStats(
  transactions: Array<{
    description: string;
    type: "INCOME" | "EXPENSE";
    category?: string | null;
  }>
): {
  total: number;
  categorized: number;
  uncategorized: number;
  accuracy: number;
} {
  const total = transactions.length;
  let categorized = 0;
  let correctlyCategorized = 0;

  transactions.forEach((t) => {
    const suggested = suggestCategory(t.description, t.type);
    if (suggested) {
      categorized++;
      if (t.category === suggested) {
        correctlyCategorized++;
      }
    }
  });

  return {
    total,
    categorized,
    uncategorized: total - categorized,
    accuracy: categorized > 0 ? (correctlyCategorized / categorized) * 100 : 0,
  };
}

