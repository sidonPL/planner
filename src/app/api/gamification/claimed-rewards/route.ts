import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/gamification/claimed-rewards
 * Pobiera wszystkie kupione nagrody użytkownika (dla ThemeSelector, TitleSelector itd)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json(claimedRewards);
  } catch (error) {
    console.error('Error fetching claimed rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claimed rewards' },
      { status: 500 }
    );
  }
}

