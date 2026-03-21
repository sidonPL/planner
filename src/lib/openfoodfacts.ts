/**
 * Open Food Facts API Integration
 * Serwis do pobierania informacji o produktach spożywczych
 * Dokumentacja API: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

const OPENFOODFACTS_API_URL = process.env.OPENFOODFACTS_API_URL || 'https://world.openfoodfacts.org/api/v2';
const USER_AGENT = 'FamilyPlanner/1.0 (contact@familyplanner.app)'; // Wymagane przez API

export interface NutritionData {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  salt?: number;
  sugar?: number;
  saturatedFat?: number;
  sodium?: number;
}

export interface ProductData {
  barcode: string;
  name: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  quantity?: string;
  imageUrl?: string;
  nutrition?: NutritionData;
  ingredients?: string[];
  allergens?: string[];
  labels?: string[];
  nutriScore?: string;
  novaGroup?: number;
  ecoScore?: string;
  source: 'openfoodfacts' | 'usda' | 'manual';
  sourceUrl?: string;
}

interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  code: string;
  product?: {
    product_name?: string;
    product_name_pl?: string;
    brands?: string;
    manufacturers?: string;
    categories?: string;
    quantity?: string;
    image_url?: string;
    image_front_url?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'proteins_100g'?: number;
      'carbohydrates_100g'?: number;
      'fat_100g'?: number;
      'fiber_100g'?: number;
      'salt_100g'?: number;
      'sugars_100g'?: number;
      'saturated-fat_100g'?: number;
      'sodium_100g'?: number;
    };
    ingredients_text?: string;
    ingredients_text_pl?: string;
    allergens?: string;
    allergens_tags?: string[];
    labels?: string;
    labels_tags?: string[];
    nutriscore_grade?: string;
    nova_group?: number;
    ecoscore_grade?: string;
  };
}

function normalizeProductImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  // Open Food Facts udostępnia obrazy po HTTPS; wymuszamy HTTPS, by uniknąć mixed content.
  return url.replace(/^http:\/\//i, "https://");
}

/**
 * Pobierz informacje o produkcie po kodzie kreskowym
 */
export async function getProductByBarcode(barcode: string): Promise<ProductData | null> {
  try {
    // Walidacja kodu kreskowego (EAN-8, EAN-13, UPC-A)
    if (!isValidBarcode(barcode)) {
      console.warn(`Nieprawidłowy kod kreskowy: ${barcode}`);
      return null;
    }

    const url = `${OPENFOODFACTS_API_URL}/product/${barcode}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Open Food Facts API error: ${response.status}`);
      return null;
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      console.info(`Produkt nie znaleziony w Open Food Facts: ${barcode}`);
      return null;
    }

    return mapOpenFoodFactsProduct(barcode, data.product);
  } catch (error) {
    console.error('Błąd podczas pobierania produktu z Open Food Facts:', error);
    return null;
  }
}

/**
 * Wyszukaj produkty po nazwie
 */
export async function searchProducts(query: string, page = 1, pageSize = 20): Promise<ProductData[]> {
  try {
    const url = `${OPENFOODFACTS_API_URL}/search?search_terms=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}&fields=code,product_name,product_name_pl,brands,image_url,nutriscore_grade,nova_group`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.products || !Array.isArray(data.products)) {
      return [];
    }

    interface SearchProduct {
      code?: string;
      product_name?: string;
      product_name_pl?: string;
      brands?: string;
      image_url?: string;
      nutriscore_grade?: string;
      nova_group?: number;
    }

    return data.products
      .filter((p: SearchProduct) => p.code && p.product_name)
      .map((p: SearchProduct) => ({
        barcode: p.code!,
        name: p.product_name_pl || p.product_name || 'Nieznany produkt',
        brand: p.brands,
        imageUrl: normalizeProductImageUrl(p.image_url),
        nutriScore: p.nutriscore_grade?.toUpperCase(),
        novaGroup: p.nova_group,
        source: 'openfoodfacts' as const,
        sourceUrl: `https://world.openfoodfacts.org/product/${p.code}`,
      }));
  } catch (error) {
    console.error('Błąd podczas wyszukiwania produktów:', error);
    return [];
  }
}

/**
 * Mapowanie produktu z Open Food Facts do naszego formatu
 */
function mapOpenFoodFactsProduct(barcode: string, product: NonNullable<OpenFoodFactsResponse['product']>): ProductData {
  // Preferuj polskie nazwy
  const name = product.product_name_pl || product.product_name || 'Nieznany produkt';

  // Wyciągnij pierwszą markę (jeśli jest wiele)
  const brand = product.brands?.split(',')[0]?.trim();

  // Wyciągnij pierwszego producenta
  const manufacturer = product.manufacturers?.split(',')[0]?.trim();

  // Wyciągnij główną kategorię
  const category = product.categories?.split(',')[0]?.trim();

  // Preferuj zdjęcie z przodu
  const imageUrl = normalizeProductImageUrl(product.image_front_url || product.image_url);

  // Wartości odżywcze (na 100g/100ml)
  const nutrition: NutritionData | undefined = product.nutriments ? {
    calories: product.nutriments['energy-kcal_100g'],
    protein: product.nutriments['proteins_100g'],
    carbohydrates: product.nutriments['carbohydrates_100g'],
    fat: product.nutriments['fat_100g'],
    fiber: product.nutriments['fiber_100g'],
    salt: product.nutriments['salt_100g'],
    sugar: product.nutriments['sugars_100g'],
    saturatedFat: product.nutriments['saturated-fat_100g'],
    sodium: product.nutriments['sodium_100g'],
  } : undefined;

  // Składniki (preferuj polski)
  const ingredientsText = product.ingredients_text_pl || product.ingredients_text;
  const ingredients = ingredientsText ? [ingredientsText] : [];

  // Alergeny
  const allergens = product.allergens_tags?.map(tag =>
    tag.replace('en:', '').replace(/-/g, ' ')
  ) || [];

  // Etykiety (bio, vegan, gluten-free itp.)
  const labels = product.labels_tags?.map(tag =>
    tag.replace('en:', '').replace(/-/g, ' ')
  ) || [];

  return {
    barcode,
    name,
    brand,
    manufacturer,
    category,
    quantity: product.quantity,
    imageUrl,
    nutrition,
    ingredients,
    allergens,
    labels,
    nutriScore: product.nutriscore_grade?.toUpperCase(),
    novaGroup: product.nova_group,
    ecoScore: product.ecoscore_grade?.toUpperCase(),
    source: 'openfoodfacts',
    sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
  };
}

/**
 * Walidacja kodu kreskowego
 * Obsługuje: EAN-8, EAN-13, UPC-A (12 cyfr)
 */
function isValidBarcode(barcode: string): boolean {
  // Usuń białe znaki
  const cleaned = barcode.trim();

  // Sprawdź czy zawiera tylko cyfry
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  // Sprawdź długość (8, 12, 13 cyfr)
  const length = cleaned.length;
  return length === 8 || length === 12 || length === 13;
}

/**
 * Oblicz sumę kontrolną EAN-13
 * (opcjonalnie do walidacji)
 */
export function calculateEANChecksum(barcode: string): number {
  const digits = barcode.slice(0, -1).split('').map(Number);
  let sum = 0;

  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Sprawdź czy kod kreskowy ma poprawną sumę kontrolną
 */
export function isValidEANChecksum(barcode: string): boolean {
  if (barcode.length !== 13) {
    return false;
  }

  const providedChecksum = parseInt(barcode.slice(-1));
  const calculatedChecksum = calculateEANChecksum(barcode);

  return providedChecksum === calculatedChecksum;
}

