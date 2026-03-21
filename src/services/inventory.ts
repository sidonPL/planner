import prisma from '@/lib/prisma';
import { InventoryItem, Prisma } from '@prisma/client';
import { normalizeBrandName, normalizeProductName } from '@/lib/name-normalization';

/**
 * Get all inventory items for a household
 */
export async function getInventoryItems(householdId: string): Promise<InventoryItem[]> {
  return prisma.inventoryItem.findMany({
    where: {
      householdId,
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItemById(id: string, householdId: string): Promise<InventoryItem | null> {
  return prisma.inventoryItem.findFirst({
    where: {
      id,
      householdId,
    },
  });
}

export interface NewInventoryItem {
  name: string;
  quantity: number;
  unit?: string | null;
  category?: string | null;
  location?: string | null;
  expiryDate?: Date | null;
  minQuantity?: number | null;
  autoRestock?: boolean;
  barcode?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  nutritionData?: Prisma.InputJsonValue | null;
  scannedProductId?: string | null;
  price?: number | null;
  householdId: string;
}

function normalizeNullable(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

function isSameInventoryVariant(item: InventoryItem, data: NewInventoryItem): boolean {
  const incomingBarcode = normalizeNullable(data.barcode);
  const itemBarcode = normalizeNullable(item.barcode);

  if (incomingBarcode || itemBarcode) {
    return incomingBarcode !== null && itemBarcode !== null && incomingBarcode === itemBarcode;
  }

  const sameName = normalizeProductName(item.name) === normalizeProductName(data.name);
  const sameBrand = normalizeBrandName(item.brand) === normalizeBrandName(data.brand);
  const sameUnit = normalizeNullable(item.unit) === normalizeNullable(data.unit);
  const sameLocation = normalizeNullable(item.location) === normalizeNullable(data.location);

  return sameName && sameBrand && sameUnit && sameLocation;
}

function pickMergedExpiry(existing: Date | null, incoming: Date | null | undefined): Date | null {
  if (!incoming) return existing;
  if (!existing) return incoming;
  return incoming < existing ? incoming : existing;
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(data: NewInventoryItem): Promise<InventoryItem> {
  const normalizedName = normalizeNullable(data.name) || data.name.trim();
  const normalizedBrand = normalizeNullable(data.brand);
  const normalizedBarcode = normalizeNullable(data.barcode);

  const candidates = await prisma.inventoryItem.findMany({
    where: {
      householdId: data.householdId,
      name: {
        equals: normalizedName,
        mode: 'insensitive',
      },
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
  });

  const existingVariant = candidates.find((item) =>
    isSameInventoryVariant(item, {
      ...data,
      name: normalizedName,
      brand: normalizedBrand,
      barcode: normalizedBarcode,
    })
  );

  if (existingVariant) {
    return prisma.inventoryItem.update({
      where: { id: existingVariant.id },
      data: {
        quantity: existingVariant.quantity + data.quantity,
        expiryDate: pickMergedExpiry(existingVariant.expiryDate, data.expiryDate),
        minQuantity: data.minQuantity ?? existingVariant.minQuantity,
        autoRestock: data.autoRestock ?? existingVariant.autoRestock,
        category: data.category ?? existingVariant.category,
        location: data.location ?? existingVariant.location,
        unit: data.unit ?? existingVariant.unit,
        brand: existingVariant.brand || normalizedBrand,
        barcode: existingVariant.barcode || normalizedBarcode,
        imageUrl: existingVariant.imageUrl || normalizeNullable(data.imageUrl),
      },
    });
  }

  const createData: Prisma.InventoryItemUncheckedCreateInput = {
    name: normalizedName,
    quantity: data.quantity,
    unit: normalizeNullable(data.unit),
    category: normalizeNullable(data.category),
    location: normalizeNullable(data.location),
    expiryDate: data.expiryDate ?? null,
    minQuantity: data.minQuantity ?? null,
    autoRestock: data.autoRestock ?? false,
    householdId: data.householdId,
    barcode: normalizedBarcode,
    brand: normalizedBrand,
    imageUrl: normalizeNullable(data.imageUrl),
    scannedProductId: data.scannedProductId ?? null,
    price: data.price ?? null,
  };

  if (data.nutritionData !== undefined) {
    createData.nutritionData = data.nutritionData === null ? Prisma.JsonNull : data.nutritionData;
  }

  return prisma.inventoryItem.create({
    data: createData,
  });
}

export interface UpdateInventoryItem {
  name?: string;
  quantity?: number;
  unit?: string | null;
  category?: string | null;
  location?: string | null;
  expiryDate?: Date | null;
  minQuantity?: number | null;
  autoRestock?: boolean;
}

/**
 * Update an existing inventory item
 */
export async function updateInventoryItem(
  id: string,
  data: UpdateInventoryItem,
  householdId: string
): Promise<InventoryItem | null> {
  // First check if the item exists and belongs to the household
  const existingItem = await prisma.inventoryItem.findFirst({
    where: {
      id,
      householdId,
    },
  });

  if (!existingItem) {
    return null;
  }

  return prisma.inventoryItem.update({
    where: { id },
    data,
  });
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(id: string, householdId: string): Promise<boolean> {
  // First check if the item exists and belongs to the household
  const existingItem = await prisma.inventoryItem.findFirst({
    where: {
      id,
      householdId,
    },
  });

  if (!existingItem) {
    return false;
  }

  await prisma.inventoryItem.delete({
    where: { id },
  });

  return true;
}

/**
 * Get low stock items for a household
 */
export async function getLowStockItems(householdId: string): Promise<InventoryItem[]> {
  const items = await prisma.inventoryItem.findMany({
    where: {
      householdId,
      minQuantity: {
        not: null,
      },
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  // Filter items where current quantity is less than or equal to minimum quantity
  return items.filter(item => {
    if (item.minQuantity === null) return false;
    return item.quantity <= item.minQuantity;
  });
}

/**
 * Get expired items for a household
 */
export async function getExpiredItems(householdId: string): Promise<InventoryItem[]> {
  const now = new Date();

  return prisma.inventoryItem.findMany({
    where: {
      householdId,
      expiryDate: {
        not: null,
        lt: now,
      },
    },
    orderBy: {
      expiryDate: 'asc',
    },
  });
}

/**
 * Get items expiring soon (within the next 7 days)
 */
export async function getExpiringSoonItems(householdId: string, days: number = 7): Promise<InventoryItem[]> {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return prisma.inventoryItem.findMany({
    where: {
      householdId,
      expiryDate: {
        not: null,
        gte: now,
        lte: future,
      },
    },
    orderBy: {
      expiryDate: 'asc',
    },
  });
}

