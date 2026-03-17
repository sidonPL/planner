import prisma from '@/lib/prisma';
import { InventoryItem } from '@prisma/client';

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
  householdId: string;
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(data: NewInventoryItem): Promise<InventoryItem> {
  return prisma.inventoryItem.create({
    data,
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

