/**
 * Google Gemini API Service dla inteligentnego parsowania przepisów
 *
 * Wykorzystuje Gemini do wyodrębnienia strukturalnych danych z HTML przepisu
 * i dopasowania ich do naszego schematu bazy danych.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicjalizacja Gemini
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

interface GeminiRecipeData {
  name: string;
  description?: string;
  instructions?: string; // Opisowy sposób przygotowania
  image?: string;
  category?: string;
  cuisine?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    optional?: boolean;
  }>;
  steps: Array<{
    content: string;
    duration?: number;
    temperature?: number;
    tip?: string;
  }>;
  tags?: string[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
}

const RECIPE_EXTRACTION_PROMPT = `
Jesteś ekspertem w analizie przepisów kulinarnych. Przeanalizuj poniższy HTML przepisu i wyodrębnij z niego strukturalne dane.

WAŻNE ZASADY:
1. Ignoruj komentarze użytkowników, przyciski nawigacji, reklamy
2. Wyodrębnij TYLKO rzeczywiste składniki (z ilościami i jednostkami)
3. Wyodrębnij TYLKO rzeczywiste kroki przygotowania (z czasownikami)
4. Wykryj czas i temperaturę w tekście kroków
5. Normalizuj jednostki (gramów→g, kilogramów→kg, litrów→l)
6. Kategorię dopasuj do: breakfast, lunch, dinner, desserts, snacks, drinks, other
7. **NOWE**: Jeśli znajdziesz opisowy sposób przygotowania (ciągły tekst), dodaj go do "instructions"

Zwróć TYLKO JSON bez dodatkowego tekstu:
{
  "name": "Pełna nazwa przepisu",
  "description": "Krótki opis (max 200 znaków)",
  "instructions": "Opcjonalny opisowy sposób przygotowania jako ciągły tekst. Umyj truskawki pod zimną wodą i osusz. Przygotuj cztery czyste słoiki...",
  "category": "desserts",
  "cuisine": "polska",
  "servings": 4,
  "prepTime": 20,
  "cookTime": 30,
  "difficulty": "MEDIUM",
  "ingredients": [
    {
      "name": "truskawek",
      "quantity": 1,
      "unit": "kg",
      "optional": false
    }
  ],
  "steps": [
    {
      "content": "Umyj truskawki pod zimną wodą i osusz",
      "duration": 5,
      "temperature": null,
      "tip": null
    }
  ],
  "tags": ["truskawki", "kompot", "przetwory"],
  "calories": 150,
  "protein": 5,
  "carbs": 30,
  "fat": 2,
  "isVegetarian": true,
  "isVegan": false,
  "isGlutenFree": true
}

HTML przepisu:
`;

export async function parseRecipeWithGemini(
  html: string,
  _url: string // prefixed with _ to indicate intentionally unused
): Promise<GeminiRecipeData | null> {
  // Sprawdź czy Gemini jest dostępne
  if (!genAI) {
    console.warn("Gemini API not configured, skipping AI parsing");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Ogranicz HTML do rozsądnego rozmiaru (max 50KB)
    const truncatedHtml = html.substring(0, 50000);

    const result = await model.generateContent(
      RECIPE_EXTRACTION_PROMPT + truncatedHtml
    );

    const response = await result.response;
    const text = response.text();

    // Wyodrębnij JSON z odpowiedzi (usuń markdown code blocks jeśli są)
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                     text.match(/\{[\s\S]*}/);

    if (!jsonMatch) {
      console.warn("No JSON found in Gemini response");
      return null;
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    const parsed: GeminiRecipeData = JSON.parse(jsonText);

    // Walidacja podstawowa
    if (!parsed.name || !parsed.ingredients || !parsed.steps) {
      console.warn("Invalid recipe data from Gemini");
      return null;
    }

    console.log(`✅ Gemini successfully parsed recipe: ${parsed.name}`);
    console.log(`   - ${parsed.ingredients.length} ingredients`);
    console.log(`   - ${parsed.steps.length} steps`);

    return parsed;
  } catch (error) {
    console.error("Error parsing recipe with Gemini:", error);
    return null;
  }
}

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}


