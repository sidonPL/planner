import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/gamification/rewards/stats
 * Zwraca statystyki wykorzystania nagród
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'month';

    // Oblicz datę rozpoczęcia w zależności od timeframe
    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Od początku czasu
        break;
    }

    // Pobierz wszystkie claimed rewards użytkownika z relacją reward
    const claimedRewards = await prisma.claimedReward.findMany({
      where: {
        userId: session.user.id,
        claimedAt: { gte: startDate },
      },
      include: {
        reward: {
          select: {
            id: true,
            name: true,
            category: true,
            pointsCost: true,
            effectData: true,
          },
        },
      },
      orderBy: {
        claimedAt: 'desc',
      },
    });

    // Statystyki podstawowe
    const totalPurchased = claimedRewards.length;
    const totalSpent = claimedRewards.reduce(
      (sum, cr) => sum + cr.reward.pointsCost,
      0
    );
    const activeRewards = claimedRewards.filter((cr) => cr.isActive).length;
    const fulfilledRewards = claimedRewards.filter((cr) => cr.fulfilled).length;

    // Najpopularniejsza kategoria
    const categoryCount: Record<string, number> = {};
    claimedRewards.forEach((cr) => {
      categoryCount[cr.reward.category] = (categoryCount[cr.reward.category] || 0) + 1;
    });
    const mostUsedCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'NONE';

    // Statystyki XP Boosts
    const xpBoostRewards = claimedRewards.filter(
      (cr) => cr.reward.category === 'PERK' &&
      (cr.reward.effectData as any)?.type === 'xp_boost'
    );

    const xpBoostStats = {
      totalActivated: xpBoostRewards.filter((cr) => cr.isActive).length,
      totalClaimed: xpBoostRewards.length,
      averageMultiplier: 0,
      bestMultiplier: 0,
    };

    if (xpBoostRewards.length > 0) {
      const multipliers = xpBoostRewards
        .map((cr) => (cr.reward.effectData as any)?.multiplier || 1.0)
        .filter((m) => m > 1.0);

      if (multipliers.length > 0) {
        xpBoostStats.averageMultiplier =
          multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
        xpBoostStats.bestMultiplier = Math.max(...multipliers);
      }
    }

    return NextResponse.json({
      totalPurchased,
      totalSpent,
      activeRewards,
      fulfilledRewards,
      mostUsedCategory,
      xpBoosts: xpBoostStats,
      recentRewards: claimedRewards.slice(0, 10).map((cr) => ({
        id: cr.id,
        rewardName: cr.reward.name,
        category: cr.reward.category,
        claimedAt: cr.claimedAt,
        isActive: cr.isActive,
        fulfilled: cr.fulfilled,
      })),
    });
  } catch (error) {
    console.error('Error fetching reward stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reward stats' },
      { status: 500 }
    );
  }
}

