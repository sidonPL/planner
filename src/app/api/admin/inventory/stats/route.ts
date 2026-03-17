import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all inventory items
    const items = await prisma.inventoryItem.findMany({
      include: {
        household: {
          select: {
            name: true,
          },
        },
      },
    });

    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

    // Expiring items (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringItems = items
      .filter((item) => item.expiryDate && item.expiryDate <= sevenDaysFromNow)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        expiryDate: item.expiryDate,
        householdName: item.household?.name || 'Nieznane',
      }));

    const expiringCount = expiringItems.length;

    // Low stock items
    const lowStockCount = items.filter(
      (item) => item.minQuantity && item.quantity <= item.minQuantity
    ).length;

    // Top categories
    const categoryCounts = items.reduce((acc: Record<string, number>, item) => {
      const cat = item.category || 'Inne';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      stats: {
        totalItems,
        totalValue,
        expiringCount,
        lowStockCount,
        topCategories,
        expiringItems,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

