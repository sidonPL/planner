import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/gamification/my-rewards
 * Pobiera wszystkie kupione nagrody użytkownika
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pobierz wszystkie claimed rewards użytkownika
    const claimedRewards = await prisma.claimedReward.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        reward: true,
      },
      orderBy: {
        claimedAt: 'desc',
      },
    });

    // Grupuj według kategorii
    const grouped = claimedRewards.reduce((acc, cr) => {
      const category = cr.reward.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(cr);
      return acc;
    }, {} as Record<string, typeof claimedRewards>);

    return NextResponse.json({
      all: claimedRewards,
      grouped,
      active: claimedRewards.filter((cr) => cr.isActive),
      inactive: claimedRewards.filter((cr) => !cr.isActive),
    });
  } catch (error) {
    console.error('Error fetching my rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

