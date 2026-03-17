import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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
 * POST /api/gamification/rewards/purchase
 * Purchase a reward with XP
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const householdId = await resolveHouseholdId(session.user.id, session.user.householdId);
    if (!householdId) {
      return NextResponse.json({ error: 'No household assigned' }, { status: 400 });
    }

    const { rewardId } = await request.json();

    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
    }

    // Get reward and user data
    const [reward, user] = await Promise.all([
      prisma.reward.findUnique({
        where: { id: rewardId },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          xp: true,
          level: true,
          userAchievements: {
            select: { achievementId: true },
          },
        },
      }),
    ]);

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validation
    if (!reward.isActive) {
      return NextResponse.json({ error: 'Reward is not available' }, { status: 400 });
    }

    if (reward.householdId !== householdId) {
      return NextResponse.json({ error: 'Reward belongs to different household' }, { status: 403 });
    }

    if (user.xp < reward.pointsCost) {
      return NextResponse.json({ error: 'Not enough XP' }, { status: 400 });
    }

    if (reward.requiredLevel && user.level < reward.requiredLevel) {
      return NextResponse.json(
        { error: `Requires level ${reward.requiredLevel}` },
        { status: 400 }
      );
    }

    if (reward.requiredAchievementId) {
      const hasAchievement = user.userAchievements.some(
        (ua) => ua.achievementId === reward.requiredAchievementId
      );
      if (!hasAchievement) {
        return NextResponse.json(
          { error: 'Required achievement not unlocked' },
          { status: 400 }
        );
      }
    }

    if (reward.stock !== null && reward.stock <= 0) {
      return NextResponse.json({ error: 'Reward is out of stock' }, { status: 400 });
    }

    if (reward.availableUntil && new Date() > new Date(reward.availableUntil)) {
      return NextResponse.json({ error: 'Reward has expired' }, { status: 400 });
    }

    // Transaction: deduct XP, create claim, update stock
    const result = await prisma.$transaction(async (tx) => {
      // Deduct XP
      await tx.user.update({
        where: { id: session.user.id },
        data: { xp: { decrement: reward.pointsCost } },
      });

      // Create claimed reward with new fields
      // Określ maxUses bazując na typie nagrody
      let maxUses: number | null = null;
      if (reward.effectData && typeof reward.effectData === 'object') {
        const effectData = reward.effectData as any;
        if (effectData.uses) {
          maxUses = effectData.uses;
        }
      }

      const claimedReward = await tx.claimedReward.create({
        data: {
          userId: session.user.id,
          rewardId: reward.id,
          isActive: false, // Nie aktywuj automatycznie
          maxUses,
        },
        include: {
          reward: true,
        },
      });

      // Update stock if limited
      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: reward.id },
          data: { stock: { decrement: 1 } },
        });
      }

      // Add to points history
      await tx.pointsHistory.create({
        data: {
          userId: session.user.id,
          amount: -reward.pointsCost,
          reason: `Zakup: ${reward.name}`,
          type: 'SPENT',
        },
      });

      return claimedReward;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error purchasing reward:', error);
    return NextResponse.json(
      { error: 'Failed to purchase reward' },
      { status: 500 }
    );
  }
}

