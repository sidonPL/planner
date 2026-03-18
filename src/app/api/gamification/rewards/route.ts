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

    const claimedRewards = await prisma.claimedReward.findMany({
      where: { userId: session.user.id },
      select: { rewardId: true, isActive: true },
    });

    const rewardUsage = claimedRewards.reduce<Record<string, { count: number; activeCount: number }>>((acc, claim) => {
      if (!acc[claim.rewardId]) {
        acc[claim.rewardId] = { count: 0, activeCount: 0 };
      }
      acc[claim.rewardId].count += 1;
      if (claim.isActive) {
        acc[claim.rewardId].activeCount += 1;
      }
      return acc;
    }, {});

    const rewardsWithOwnership = rewards.map((reward) => {
      const usage = rewardUsage[reward.id] || { count: 0, activeCount: 0 };
      return {
        ...reward,
        isPurchased: usage.count > 0,
        purchaseCount: usage.count,
        hasActiveClaim: usage.activeCount > 0,
      };
    });

    return NextResponse.json(rewardsWithOwnership);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

