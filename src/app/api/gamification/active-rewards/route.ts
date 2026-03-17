import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hasActiveXPBoost } from '@/lib/xp';

/**
 * GET /api/gamification/active-rewards
 * Pobiera aktywne nagrody użytkownika
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pobierz aktywne nagrody użytkownika
    const activeRewards = await prisma.claimedReward.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        reward: true,
      },
      orderBy: {
        claimedAt: 'desc',
      },
    });

    // Sprawdź aktywny XP boost
    const xpBoost = await hasActiveXPBoost(session.user.id);

    return NextResponse.json({
      activeRewards,
      xpBoost,
    });
  } catch (error) {
    console.error('Error fetching active rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active rewards' },
      { status: 500 }
    );
  }
}

