import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProductByBarcode, ProductData } from "@/lib/openfoodfacts";

type DbScannedProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  manufacturer: string | null;
  category: string | null;
  quantity: string | null;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fiber: number | null;
  salt: number | null;
  sugar: number | null;
  ingredients: string | null;
  allergens: string[];
  labels: string[];
  nutriScore: string | null;
  novaGroup: number | null;
  ecoScore: string | null;
  source: string;
  sourceUrl: string | null;
};

function normalizeImageUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//i, "https://");
}

// Cache w pamięci (w produkcji użyj Redis)
const productCache = new Map<string, { data: ProductData; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 godziny

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { barcode } = body;

    if (!barcode || typeof barcode !== "string") {
      return NextResponse.json(
        { error: "Kod kreskowy jest wymagany" },
        { status: 400 }
      );
    }

    // Wyczyść i zwaliduj kod kreskowy
    const cleanBarcode = barcode.trim();

    if (!/^\d{8,13}$/.test(cleanBarcode)) {
      return NextResponse.json(
        { error: "Nieprawidłowy format kodu kreskowego (wymagane 8-13 cyfr)" },
        { status: 400 }
      );
    }

    // 1. Sprawdź cache w pamięci
    const cached = productCache.get(cleanBarcode);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        product: cached.data,
        source: "cache",
      });
    }

    // 2. Sprawdź w bazie danych (produkty wcześniej zeskanowane)
    const existingProduct = await prisma.scannedProduct.findUnique({
      where: { barcode: cleanBarcode },
    });

    if (existingProduct && shouldUseCache(existingProduct.lastSync)) {
      const productData = mapDbProductToProductData(existingProduct);

      // Zaktualizuj cache
      productCache.set(cleanBarcode, {
        data: productData,
        timestamp: Date.now(),
      });

      // Zwiększ licznik skanów
      await prisma.scannedProduct.update({
        where: { id: existingProduct.id },
        data: { scanCount: { increment: 1 } },
      });

      return NextResponse.json({
        success: true,
        product: productData,
        source: "database",
      });
    }

    // 3. Pobierz z Open Food Facts API
    const productData = await getProductByBarcode(cleanBarcode);

    if (!productData) {
      return NextResponse.json({
        success: false,
        product: null,
        source: "notfound",
        message: "Produkt nie został znaleziony w bazie Open Food Facts",
      });
    }

    // 4. Zapisz/zaktualizuj w bazie danych
    await prisma.scannedProduct.upsert({
      where: { barcode: cleanBarcode },
      create: {
        barcode: cleanBarcode,
        name: productData.name,
        brand: productData.brand,
        manufacturer: productData.manufacturer,
        category: productData.category,
        quantity: productData.quantity,
        imageUrl: productData.imageUrl,
        calories: productData.nutrition?.calories,
        protein: productData.nutrition?.protein,
        carbohydrates: productData.nutrition?.carbohydrates,
        fat: productData.nutrition?.fat,
        fiber: productData.nutrition?.fiber,
        salt: productData.nutrition?.salt,
        sugar: productData.nutrition?.sugar,
        ingredients: productData.ingredients ? JSON.stringify(productData.ingredients) : null,
        allergens: productData.allergens || [],
        labels: productData.labels || [],
        nutriScore: productData.nutriScore,
        novaGroup: productData.novaGroup,
        ecoScore: productData.ecoScore,
        source: productData.source,
        sourceUrl: productData.sourceUrl,
        lastSync: new Date(),
        scanCount: 1,
      },
      update: {
        name: productData.name,
        brand: productData.brand,
        manufacturer: productData.manufacturer,
        category: productData.category,
        quantity: productData.quantity,
        imageUrl: productData.imageUrl,
        calories: productData.nutrition?.calories,
        protein: productData.nutrition?.protein,
        carbohydrates: productData.nutrition?.carbohydrates,
        fat: productData.nutrition?.fat,
        fiber: productData.nutrition?.fiber,
        salt: productData.nutrition?.salt,
        sugar: productData.nutrition?.sugar,
        ingredients: productData.ingredients ? JSON.stringify(productData.ingredients) : null,
        allergens: productData.allergens || [],
        labels: productData.labels || [],
        nutriScore: productData.nutriScore,
        novaGroup: productData.novaGroup,
        ecoScore: productData.ecoScore,
        lastSync: new Date(),
        scanCount: { increment: 1 },
      },
    });

    // 5. Zaktualizuj cache
    productCache.set(cleanBarcode, {
      data: productData,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      product: productData,
      source: "openfoodfacts",
    });
  } catch (error) {
    console.error("Error scanning product:", error);
    return NextResponse.json(
      { error: "Błąd podczas skanowania produktu" },
      { status: 500 }
    );
  }
}

// Pomocnicze funkcje

function shouldUseCache(lastSync: Date): boolean {
  const now = new Date();
  const diff = now.getTime() - lastSync.getTime();
  return diff < CACHE_TTL;
}

function mapDbProductToProductData(product: DbScannedProduct): ProductData {
  return {
    barcode: product.barcode,
    name: product.name,
    brand: product.brand || undefined,
    manufacturer: product.manufacturer || undefined,
    category: product.category || undefined,
    quantity: product.quantity || undefined,
    imageUrl: normalizeImageUrl(product.imageUrl),
    nutrition: {
      calories: product.calories || undefined,
      protein: product.protein || undefined,
      carbohydrates: product.carbohydrates || undefined,
      fat: product.fat || undefined,
      fiber: product.fiber || undefined,
      salt: product.salt || undefined,
      sugar: product.sugar || undefined,
    },
    ingredients: product.ingredients ? JSON.parse(product.ingredients) : undefined,
    allergens: product.allergens || [],
    labels: product.labels || [],
    nutriScore: product.nutriScore || undefined,
    novaGroup: product.novaGroup || undefined,
    ecoScore: product.ecoScore || undefined,
    source: product.source as ProductData["source"],
    sourceUrl: product.sourceUrl || undefined,
  };
}

