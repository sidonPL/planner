import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const householdId = session.user.householdId;

    // Pobierz zakupioną historię (ostatnie 90 dni)
    const purchasedItems = await prisma.shoppingItem.findMany({
      where: {
        householdId,
        isPurchased: true,
        updatedAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // User stats
    const userStatsMap = new Map<string, {
      userId: string;
      userName: string;
      color: string;
      totalPurchased: number;
      totalTime: number;
      count: number;
    }>();

    purchasedItems.forEach((item) => {
      if (item.assignedTo) {
        const existing = userStatsMap.get(item.assignedTo.id) || {
          userId: item.assignedTo.id,
          userName: item.assignedTo.name || 'Unknown',
          color: item.assignedTo.color,
          totalPurchased: 0,
          totalTime: 0,
          count: 0,
        };

        existing.totalPurchased++;

        // Oblicz czas od utworzenia do zakupu (w godzinach)
        const timeDiff = (item.updatedAt.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60);
        if (timeDiff > 0) {
          existing.totalTime += timeDiff;
          existing.count++;
        }

        userStatsMap.set(item.assignedTo.id, existing);
      }
    });

    const userStats = Array.from(userStatsMap.values())
      .map((user) => ({
        userId: user.userId,
        userName: user.userName,
        color: user.color,
        totalPurchased: user.totalPurchased,
        averageTime: user.count > 0 ? user.totalTime / user.count : 0,
      }))
      .sort((a, b) => b.totalPurchased - a.totalPurchased);

    // Category stats
    const categoryMap = new Map<string, { count: number; buyers: Map<string, number> }>();

    purchasedItems.forEach((item) => {
      const category = item.category || 'other';
      const existing = categoryMap.get(category) || { count: 0, buyers: new Map() };

      existing.count++;

      if (item.assignedTo) {
        const buyerCount = existing.buyers.get(item.assignedTo.name || 'Unknown') || 0;
        existing.buyers.set(item.assignedTo.name || 'Unknown', buyerCount + 1);
      }

      categoryMap.set(category, existing);
    });

    const categoryStats = Array.from(categoryMap.entries())
      .map(([category, data]) => {
        const mostFrequent = Array.from(data.buyers.entries())
          .sort((a, b) => b[1] - a[1])[0];

        return {
          category,
          count: data.count,
          mostFrequentBuyer: mostFrequent ? mostFrequent[0] : '',
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top products
    const productMap = new Map<string, { count: number; lastBuyer: string; lastDate: Date }>();

    purchasedItems.forEach((item) => {
      const existing = productMap.get(item.name) || {
        count: 0,
        lastBuyer: '',
        lastDate: new Date(0),
      };

      existing.count++;

      if (item.updatedAt > existing.lastDate && item.assignedTo) {
        existing.lastBuyer = item.assignedTo.name || 'Unknown';
        existing.lastDate = item.updatedAt;
      }

      productMap.set(item.name, existing);
    });

    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        lastPurchasedBy: data.lastBuyer,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      userStats,
      categoryStats,
      topProducts,
    });
  } catch (error) {
    console.error("Error fetching shopping analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

