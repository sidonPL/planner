import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/gamification/streak-shield/status
 * Zwraca status aktywnej tarczy streaku
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Znajdź aktywną tarczę streaku
    const activeShield = await prisma.claimedReward.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
        reward: {
          effectData: {
            path: ['type'],
            equals: 'streak_shield',
          },
        },
        // Nie może być wygasła
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        reward: true,
      },
    });

    if (!activeShield) {
      return NextResponse.json({
        active: false,
        usesLeft: 0,
        maxUses: 0,
        expiresAt: null,
      });
    }

    const maxUses = activeShield.maxUses || 1;
    const usesLeft = maxUses - activeShield.usedCount;

    return NextResponse.json({
      active: true,
      usesLeft,
      maxUses,
      expiresAt: activeShield.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching streak shield status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

