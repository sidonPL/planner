import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { load } from "cheerio";
import { handleApiError } from "@/lib/api-error-handler";
import { parseRecipeWithGemini, isGeminiAvailable } from "@/lib/gemini-recipe-parser";

type CheerioAPI = ReturnType<typeof load>;

interface ImportedIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  optional?: boolean;
}

interface ImportedStep {
  content: string;
  duration?: number | null;
  image?: string | null;
  temperature?: number | null;
  tip?: string | null;
  isOptional?: boolean;
}

interface ImportedRecipe {
  name: string;
  description?: string | null;
  image?: string | null;
  ingredients?: ImportedIngredient[];
  steps?: ImportedStep[];
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number;
  category?: string | null;
  cuisine?: string | null;
  tags?: string[];
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: response.status }
      );
    }

    const html = await response.text();

    // KROK 1: Próba z Gemini AI (jeśli dostępne)
    if (isGeminiAvailable()) {
      console.log("🤖 Trying Gemini AI for recipe parsing...");
      try {
        const geminiRecipe = await parseRecipeWithGemini(html, url);

        if (geminiRecipe) {
          console.log("✅ Gemini successfully parsed recipe");
          return NextResponse.json({
            recipe: geminiRecipe,
            parsedBy: "gemini"
          });
        }
      } catch (geminiError) {
        console.warn("Gemini parsing failed, falling back to traditional parser:", geminiError);
      }
    } else {
      console.log("ℹ️ Gemini API not configured, using traditional parser");
    }

    // KROK 2: Fallback do tradycyjnego parsera (Cheerio)
    console.log("📝 Using traditional HTML parser...");

    let $;
    try {
      $ = load(html);
    } catch (parseError) {
      console.error("Error parsing HTML:", parseError);
      return NextResponse.json(
        { error: "Failed to parse HTML from URL" },
        { status: 422 }
      );
    }

    // Try to extract recipe data using various selectors with error handling
    let recipe: ImportedRecipe;
    try {
      const extractedIngredients = extractIngredients($);
      const extractedSteps = extractSteps($);

      recipe = {
        name: extractRecipeName($),
        description: extractDescription($),
        image: extractImage($, url),
        ingredients: extractedIngredients.map(ing => ({
          ...ing,
          optional: ing.optional || false,
        })),
        steps: extractedSteps,
        prepTime: extractTime($, "prep"),
        cookTime: extractTime($, "cook"),
        servings: extractServings($),
        category: extractCategory($),
        cuisine: extractCuisine($),
        tags: extractTags($),
      };
    } catch (extractError) {
      console.error("Error extracting recipe data:", extractError);
      return NextResponse.json(
        {
          error: "Could not extract recipe data from URL",
          hint: "The page structure is not supported. Try entering manually.",
        },
        { status: 422 }
      );
    }

    // Validate that we got at least a name
    if (!recipe.name) {
      return NextResponse.json(
        {
          error: "Could not extract recipe data from URL",
          hint: "Try a different recipe website or enter manually",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      recipe,
      parsedBy: "traditional"
    });
  } catch (error) {
    console.error("Import error:", error);
    return handleApiError(error);
  }
}

function extractRecipeName($: CheerioAPI): string {
  const selectors = [
    'h1[class*="recipe"]',
    'h1[itemprop="name"]',
    ".recipe-title",
    ".recipe-name",
    'h1[class*="title"]',
    "h1",
  ];

  for (const selector of selectors) {
    try {
      const element = $(selector).first();
      if (element.length > 0) {
        const name = element.text().trim();
        if (name && name.length > 3) return name;
      }
    } catch (e) {
      console.warn(`Error extracting name with selector ${selector}:`, e);
    }
  }

  return "";
}

function extractDescription($: CheerioAPI): string | null {
  const selectors = [
    '[itemprop="description"]',
    ".recipe-description",
    'meta[name="description"]',
    'meta[property="og:description"]',
  ];

  for (const selector of selectors) {
    try {
      const element = $(selector).first();
      if (element.length > 0) {
        const desc = element.text() || element.attr("content") || "";
        if (desc.trim().length > 10) return desc.trim();
      }
    } catch (e) {
      console.warn(`Error extracting description with selector ${selector}:`, e);
    }
  }

  return null;
}

function extractImage($: CheerioAPI, baseUrl: string): string | null {
  const selectors = [
    '[itemprop="image"]',
    ".recipe-image img",
    'meta[property="og:image"]',
    ".wp-post-image",
    'img[class*="recipe"]',
  ];

  for (const selector of selectors) {
    try {
      const element = $(selector).first();
      if (element.length > 0) {
        const img = element.attr("src") || element.attr("content") || "";
        if (img) {
          // Make relative URLs absolute
          try {
            return new URL(img, baseUrl).href;
          } catch {
            return img;
          }
        }
      }
    } catch (e) {
      console.warn(`Error extracting image with selector ${selector}:`, e);
    }
  }

  return null;
}

function extractIngredients($: CheerioAPI): ImportedIngredient[] {
  const ingredients: ImportedIngredient[] = [];

  const selectors = [
    '[itemprop="recipeIngredient"]',
    '.recipe-ingredients li',
    '.ingredients li',
    'li[class*="ingredient"]',
    '.ingredient-list li',
  ];

  for (const selector of selectors) {
    try {
      const items = $(selector);
      if (items.length > 0) {
        items.each((_: number, el: unknown) => {
          if (!el) return;
          try {
            const text = $(el).text().trim();

            // Filtruj niepotrzebne elementy
            if (shouldSkipIngredient(text)) {
              return;
            }

            if (text && text.length > 2) {
              // Wyczyść tekst z notatek i dodatkowych informacji
              const cleanedText = cleanIngredientText(text);

              // Parsuj składnik
              const parsed = parseIngredient(cleanedText);

              // Dodaj tylko jeśli ma nazwę
              if (parsed.name && parsed.name.length > 1) {
                ingredients.push({
                  ...parsed,
                  optional: cleanedText.toLowerCase().includes('opcjonalny') ||
                            cleanedText.toLowerCase().includes('optional') ||
                            cleanedText.toLowerCase().includes('dodatkowo'),
                });
              }
            }
          } catch (e) {
            console.warn(`Error processing ingredient element:`, e);
          }
        });

        if (ingredients.length > 0) break;
      }
    } catch (e) {
      console.warn(`Error extracting ingredients with selector ${selector}:`, e);
    }
  }

  return ingredients;
}

function shouldSkipIngredient(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Pomijaj nagłówki, notatki, instrukcje
  const skipPatterns = [
    'składniki',
    'ingredients',
    'użyte słoiki',
    'szklanka ma u mnie',
    'kalorie policzone',
    'wartość energetyczna',
    'użyj',
    'uwaga:',
    'info:',
    'tip:',
    'wskazówka:',
  ];

  // Pomiń jeśli tekst zaczyna się od tych fraz
  if (skipPatterns.some(pattern => lowerText.startsWith(pattern))) {
    return true;
  }

  // Pomiń jeśli tekst jest za długi (>150 znaków) - to pewnie opis
  return text.length > 150;
}

function cleanIngredientText(text: string): string {
  // Usuń numery na początku: "1. ", "1) "
  let cleaned = text
    .replace(/^\d+\.\s*/, '')
    .replace(/^\d+\)\s*/, '');

  // Usuń treści w nawiasach kwadratowych [notatka]
  cleaned = cleaned.replace(/\[.*?]/g, '');

  // Usuń " - " i to co po nim, jeśli to dodatkowa informacja (np. "16 łyżek")
  // Ale tylko jeśli po " - " jest liczba lub słowo typu "łyżka", "szklanka"
  cleaned = cleaned.replace(/\s*-\s*\d+\s*(łyżk|szklan|szczy|garść|szczyp|szczypta|łyż)/gi, '');

  return cleaned.trim();
}

function parseIngredient(text: string): { name: string; quantity?: number; unit?: string } {
  // Najpierw usuń zbędne znaki i normalizuj
  const normalized = text.trim().replace(/\s+/g, ' ');

  // Wzorce do rozpoznawania:
  // "200 g mąki", "2 łyżki cukru", "1/2 szklanki mleka", "3-4 jajka"
  const patterns = [
    // Liczba + jednostka + nazwa (np. "200g mąki", "2 kg ziemniaków")
    /^([\d,./]+(?:\s*-\s*[\d,./]+)?)\s*([a-zśćążźęółń]+)\s+(.+)$/i,
    // Liczba + spacja + jednostka + nazwa (np. "200 g mąki")
    /^([\d,./]+(?:\s*-\s*[\d,./]+)?)\s+([a-zśćążźęółń]+)\s+(.+)$/i,
    // Tylko liczba + nazwa (np. "2 jajka")
    /^([\d,./]+(?:\s*-\s*[\d,./]+)?)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      if (match.length === 4) {
        // Wzorzec z jednostką
        const [, qtyStr, unit, name] = match;
        return {
          name: name.trim(),
          quantity: parseQuantity(qtyStr),
          unit: normalizeUnit(unit?.trim()),
        };
      } else if (match.length === 3) {
        // Wzorzec bez jednostki
        const [, qtyStr, name] = match;
        return {
          name: name.trim(),
          quantity: parseQuantity(qtyStr),
        };
      }
    }
  }

  // Jeśli nic nie pasuje, zwróć całość jako nazwę
  return { name: normalized };
}

function normalizeUnit(unit: string | undefined): string | undefined {
  if (!unit) return undefined;

  const unitLower = unit.toLowerCase();

  // Mapowanie popularnych jednostek do standardowej formy
  const unitMap: Record<string, string> = {
    'g': 'g',
    'gram': 'g',
    'gramów': 'g',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilogramów': 'kg',
    'l': 'l',
    'litr': 'l',
    'litry': 'l',
    'litrów': 'l',
    'ml': 'ml',
    'mililitr': 'ml',
    'mililitry': 'ml',
    'mililitrów': 'ml',
    'łyżka': 'łyżka',
    'łyżki': 'łyżka',
    'łyżek': 'łyżka',
    'szklanka': 'szklanka',
    'szklanki': 'szklanka',
    'szklanek': 'szklanka',
    'łyżeczka': 'łyżeczka',
    'łyżeczki': 'łyżeczka',
    'szt': 'szt',
    'sztuka': 'szt',
    'sztuki': 'szt',
    'sztuk': 'szt',
  };

  return unitMap[unitLower] || unit;
}

function parseQuantity(qtyStr: string): number | undefined {
  // Usuń spacje
  const cleaned = qtyStr.replace(/\s+/g, '');

  // Obsługa zakresu (np. "3-4" -> weź średnią)
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts.length === 2) {
      const num1 = parseFloat(parts[0].replace(',', '.'));
      const num2 = parseFloat(parts[1].replace(',', '.'));
      if (!isNaN(num1) && !isNaN(num2)) {
        return (num1 + num2) / 2;
      }
    }
  }

  // Obsługa ułamków (np. "1/2", "3/4")
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0].replace(',', '.'));
      const denominator = parseFloat(parts[1].replace(',', '.'));
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }
  }

  // Zamień przecinki na kropki i sparsuj
  const num = parseFloat(cleaned.replace(',', '.'));
  return isNaN(num) ? undefined : num;
}

function extractSteps($: CheerioAPI): ImportedStep[] {
  const steps: ImportedStep[] = [];

  // Priorytyzowane selektory - najpierw schema.org, potem specyficzne dla stron
  const selectors = [
    // Schema.org markup
    '[itemprop="recipeInstructions"] li',
    '[itemprop="recipeInstructions"] ol li',
    '[itemprop="recipeInstructions"] p',
    '[itemprop="recipeInstructions"]',
    // Polskie strony kulinarne
    '.recipe-steps li',
    '.recipe-steps ol li',
    '.recipe-instructions li',
    '.instructions li',
    '.instructions ol li',
    '.steps li',
    '.steps ol li',
    // Ogólne
    'ol[class*="step"] li',
    'ol[class*="instruction"] li',
    '[class*="recipe"] ol li',
    '[class*="preparation"] li',
  ];

  for (const selector of selectors) {
    try {
      const items = $(selector);
      if (items.length > 0) {
        items.each((_i: number, el: unknown) => {
          if (!el) return;
          try {
            let text = $(el).text().trim();

            // Filtruj niepotrzebne elementy
            if (shouldSkipStep(text)) {
              return;
            }

            // Usuń numerację z początku (1., 2., Krok 1, etc.)
            text = cleanStepText(text);

            // Minimalna długość sensownego kroku
            if (text && text.length > 10) {
              // Próba wyodrębnienia czasu i temperatury z tekstu kroku
              const duration = extractDurationFromText(text);
              const temperature = extractTemperatureFromText(text);

              steps.push({
                content: text,
                duration: duration,
                image: null,
                temperature: temperature,
                tip: null,
                isOptional: false,
              });
            }
          } catch (e) {
            console.warn(`Error processing step element:`, e);
          }
        });

        // Jeśli znaleziono przynajmniej 2 kroki, uznaj za sukces
        if (steps.length >= 2) break;
      }
    } catch (e) {
      console.warn(`Error extracting steps with selector ${selector}:`, e);
    }
  }

  return steps;
}

function shouldSkipStep(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Pomijaj komentarze, linki, nawigację
  const skipPatterns = [
    'komentarze',
    'oceń',
    'drukuj',
    'zapisz',
    'udostępnij',
    'powrót',
    'podobne przepisy',
    'zobacz też',
    'polecam',
    'smacznego',
    'autor:',
    'źródło:',
    'kategoria:',
    'tagi:',
    'dieta:',
  ];

  if (skipPatterns.some(pattern => lowerText.includes(pattern))) {
    return true;
  }

  // Pomijaj krótkie teksty (prawdopodobnie to nie jest instrukcja)
  if (text.length < 15) {
    return true;
  }

  // Pomijaj teksty które wyglądają jak składniki (ilość + jednostka + nazwa)
  // np. "1 kg truskawek", "200 g cukru"
  const ingredientPattern = /^\d+[\d,./\s-]*\s*([a-zśćążźęółń]+\s+)?[a-zśćążźęółń]+$/i;
  if (ingredientPattern.test(text) && text.length < 50) {
    return true;
  }

  // Pomijaj teksty zaczynające się od liczby bez czasownika
  // (prawdopodobnie składnik, nie instrukcja)
  const startsWithNumber = /^\d/.test(text);
  const hasVerb = /\b(umyj|przygotuj|dodaj|wlej|wsyp|zagotuj|piecz|mieszaj|odstaw|nakryj|posyp|pokrój|zetrzyj|ubij|wymieszaj|zalej|gotuj|smaż|zetrzyi)/i.test(text);

  return startsWithNumber && !hasVerb && text.length < 30;
}

function cleanStepText(text: string): string {
  // Usuń numerację z początku
  return text
    .replace(/^(\d+)\.\s+/, '') // "1. "
    .replace(/^Krok\s+\d+:?\s*/i, '') // "Krok 1:"
    .replace(/^Etap\s+\d+:?\s*/i, '') // "Etap 1:"
    .trim();
}

function extractDurationFromText(text: string): number | null {
  // Szukaj wzorców typu "15 minut", "20 min", "2 godziny"
  const minuteMatch = text.match(/(\d+)\s*(?:min|minut)/i);
  if (minuteMatch) {
    return parseInt(minuteMatch[1]);
  }

  const hourMatch = text.match(/(\d+)\s*(?:h|godzin)/i);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 60;
  }

  return null;
}

function extractTemperatureFromText(text: string): number | null {
  // Szukaj wzorców typu "180°C", "180 stopni"
  const tempMatch = text.match(/(\d+)\s*(?:°C|stopni)/i);
  if (tempMatch) {
    return parseInt(tempMatch[1]);
  }

  return null;
}

function extractTime($: CheerioAPI, type: "prep" | "cook"): number | null {
  const selectors = [
    `[itemprop="${type === 'prep' ? 'prepTime' : 'cookTime'}"]`,
    `[class*="${type}"]`,
  ];

  for (const selector of selectors) {
    const timeStr = $(selector).first().text() || $(selector).attr("content");
    if (timeStr) {
      // Parse ISO 8601 duration (PT15M) or plain text (15 min)
      const minutes = parseTimeToMinutes(timeStr);
      if (minutes) return minutes;
    }
  }

  return null;
}

function parseTimeToMinutes(timeStr: string): number | null {
  // ISO 8601: PT15M, PT1H30M
  const isoMatch = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || "0");
    const minutes = parseInt(isoMatch[2] || "0");
    return hours * 60 + minutes;
  }

  // Plain text: "15 min", "1 godzina 30 minut"
  const plainMatch = timeStr.match(/(\d+)\s*(?:min|minut)/i);
  if (plainMatch) {
    return parseInt(plainMatch[1]);
  }

  const hourMatch = timeStr.match(/(\d+)\s*(?:h|godzin)/i);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 60;
  }

  return null;
}

function extractServings($: CheerioAPI): number {
  const selectors = [
    '[itemprop="recipeYield"]',
    '[class*="serving"]',
    '[class*="yield"]',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text();
    const match = text.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
  }

  return 4; // Default
}

function extractCategory($: CheerioAPI): string | null {
  const selectors = [
    '[itemprop="recipeCategory"]',
    'meta[property="article:section"]',
    '.recipe-category',
  ];

  for (const selector of selectors) {
    const cat = $(selector).first().text() || $(selector).attr("content");
    if (cat) return cat.trim().toLowerCase();
  }

  return null;
}

function extractCuisine($: CheerioAPI): string | null {
  const selectors = [
    '[itemprop="recipeCuisine"]',
    '.recipe-cuisine',
  ];

  for (const selector of selectors) {
    const cuisine = $(selector).first().text();
    if (cuisine) return cuisine.trim();
  }

  return null;
}

function extractTags($: CheerioAPI): string[] {
  const tags: string[] = [];

  const selectors = [
    'a[rel="tag"]',
    '.recipe-tags a',
    '.tags a',
  ];

  for (const selector of selectors) {
    try {
      $(selector).each((_: number, el: unknown) => {
        if (!el) return;
        try {
          const tag = $(el).text().trim();
          if (tag) tags.push(tag);
        } catch (e) {
          console.warn(`Error processing tag element:`, e);
        }
      });

      if (tags.length > 0) break;
    } catch (e) {
      console.warn(`Error extracting tags with selector ${selector}:`, e);
    }
  }

  return tags;
}

