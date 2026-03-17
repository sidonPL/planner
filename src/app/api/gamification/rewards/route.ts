import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { seedRewards } from '@/lib/seed-enhanced-gamification';

async function resolveHouseholdId(userId: string, sessionHouseholdId?: string | null) {
  if (sessionHouseholdId) {
    return sessionHouseholdId;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { householdId: true },
  });

  return user?.householdId ?? null;
}

/**
 * GET /api/gamification/rewards
 * Get all available rewards for the shop
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const householdId = await resolveHouseholdId(session.user.id, session.user.householdId);
    if (!householdId) {
      return NextResponse.json({ error: 'No household assigned' }, { status: 400 });
    }

    let rewards = await prisma.reward.findMany({
      where: {
        householdId,
        isActive: true,
        OR: [
          { availableUntil: null },
          { availableUntil: { gte: new Date() } },
        ],
      },
      orderBy: [
        { rarity: 'desc' },
        { pointsCost: 'asc' },
      ],
    });

    // New households can exist after startup seeding - seed on first shop visit.
    if (rewards.length === 0) {
      await seedRewards(householdId);
      rewards = await prisma.reward.findMany({
        where: {
          householdId,
          isActive: true,
          OR: [
            { availableUntil: null },
            { availableUntil: { gte: new Date() } },
          ],
        },
        orderBy: [
          { rarity: 'desc' },
          { pointsCost: 'asc' },
        ],
      });
    }

    return NextResponse.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

