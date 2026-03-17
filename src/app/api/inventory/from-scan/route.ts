import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      barcode,
      name, // Edytowalna nazwa produktu
      quantity,
      unit,
      location,
      expiryDate,
      minQuantity,
      autoRestock,
    } = body;

    if (!barcode || typeof barcode !== "string") {
      return NextResponse.json(
        { error: "Kod kreskowy jest wymagany" },
        { status: 400 }
      );
    }

    if (!quantity || typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "Ilość musi być liczbą większą od 0" },
        { status: 400 }
      );
    }

    // Znajdź produkt w bazie zeskanowanych produktów
    const scannedProduct = await prisma.scannedProduct.findUnique({
      where: { barcode: barcode.trim() },
    });

    if (!scannedProduct) {
      return NextResponse.json(
        { error: "Produkt nie został wcześniej zeskanowany. Najpierw zeskanuj produkt." },
        { status: 404 }
      );
    }

    // Przygotuj dane wartości odżywczych do cache
    const nutritionData = {
      calories: scannedProduct.calories,
      protein: scannedProduct.protein,
      carbohydrates: scannedProduct.carbohydrates,
      fat: scannedProduct.fat,
      fiber: scannedProduct.fiber,
      salt: scannedProduct.salt,
      sugar: scannedProduct.sugar,
    };

    // Mapowanie kategorii z Open Food Facts na nasze kategorie
    const categoryMap: Record<string, string> = {
      "dairy": "dairy",
      "nabiał": "dairy",
      "mleko": "dairy",
      "meat": "meat",
      "mięso": "meat",
      "vegetables": "vegetables",
      "warzywa": "vegetables",
      "fruits": "fruits",
      "owoce": "fruits",
      "grains": "grains",
      "pieczywo": "grains",
      "zboża": "grains",
      "canned": "canned",
      "konserwy": "canned",
      "frozen": "frozen",
      "mrożonki": "frozen",
      "spices": "spices",
      "przyprawy": "spices",
      "beverages": "beverages",
      "napoje": "beverages",
      "snacks": "snacks",
      "przekąski": "snacks",
      "breakfast": "snacks", // Petit-déjeuners -> snacks
      "petit-déjeuners": "snacks",
      "cleaning": "cleaning",
    };

    // Znajdź odpowiednią kategorię lub użyj "other"
    const normalizedCategory = scannedProduct.category?.toLowerCase() || "";
    let mappedCategory = "other";

    for (const [key, value] of Object.entries(categoryMap)) {
      if (normalizedCategory.includes(key)) {
        mappedCategory = value;
        break;
      }
    }

    // Sprawdź czy produkt o tym samym kodzie kreskowym już istnieje w inwentarzu
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        barcode: scannedProduct.barcode,
        householdId: session.user.householdId,
      },
    });

    let inventoryItem;

    if (existingItem) {
      // Produkt już istnieje - zwiększ ilość
      inventoryItem = await prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          // Zaktualizuj datę ważności jeśli podano nową i jest wcześniejsza
          expiryDate: expiryDate
            ? (existingItem.expiryDate && new Date(expiryDate) > existingItem.expiryDate)
              ? existingItem.expiryDate
              : new Date(expiryDate)
            : existingItem.expiryDate,
        },
        include: {
          scannedProduct: true,
        },
      });
    } else {
      // Nowy produkt - utwórz wpis
      inventoryItem = await prisma.inventoryItem.create({
        data: {
          name: name || scannedProduct.name, // Użyj edytowanej nazwy lub domyślnej
          quantity,
          unit: unit || guessUnit(scannedProduct.quantity),
          category: mappedCategory,
          location: location || "pantry", // Domyślnie spiżarnia
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          minQuantity: minQuantity || null,
          autoRestock: autoRestock || false,
          householdId: session.user.householdId,
          barcode: scannedProduct.barcode,
          scannedProductId: scannedProduct.id,
          brand: scannedProduct.brand,
          imageUrl: scannedProduct.imageUrl,
          nutritionData: nutritionData as any,
        },
        include: {
          scannedProduct: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      inventoryItem,
      updated: !!existingItem, // Czy zaktualizowano istniejący produkt
    });
  } catch (error) {
    console.error("Error adding product to inventory:", error);
    return NextResponse.json(
      { error: "Błąd podczas dodawania produktu do inwentarza" },
      { status: 500 }
    );
  }
}

// Pomocnicza funkcja do zgadywania jednostki na podstawie ilości produktu
function guessUnit(quantityString?: string | null): string {
  if (!quantityString) return "szt";

  const lower = quantityString.toLowerCase();

  if (lower.includes("kg")) return "kg";
  if (lower.includes("g")) return "g";
  if (lower.includes("l")) return "l";
  if (lower.includes("ml")) return "ml";
  if (lower.includes("szt")) return "szt";

  return "szt";
}

