import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RewardEffectData = {
  duration?: number;
  uses?: number;
  themeId?: string;
  titleId?: string;
};

type PurchaseBody = {
  rewardId?: string;
};

function parseEffectData(effectData: unknown): RewardEffectData {
  if (!effectData || typeof effectData !== "object") {
    return {};
  }

  return effectData as RewardEffectData;
}

function getDurationExpiry(effectData: unknown, now: Date): Date | null {
  const parsed = parseEffectData(effectData);
  if (!parsed.duration || parsed.duration <= 0) {
    return null;
  }

  return new Date(now.getTime() + parsed.duration * 1000);
}

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
 * Kupuje nagrodę ze sklepu gamifikacji.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: PurchaseBody;
    try {
      body = (await request.json()) as PurchaseBody;
    } catch {
      body = {};
    }

    const rewardId = typeof body.rewardId === "string" ? body.rewardId : "";
    if (!rewardId) {
      return NextResponse.json({ error: "Reward ID is required" }, { status: 400 });
    }

    const sessionHouseholdId =
      "householdId" in session.user
        ? (session.user.householdId as string | null | undefined)
        : null;

    const householdId = await resolveHouseholdId(session.user.id, sessionHouseholdId);

    if (!householdId) {
      return NextResponse.json({ error: "No household assigned" }, { status: 400 });
    }

    const [reward, user] = await Promise.all([
      prisma.reward.findUnique({
        where: { id: rewardId },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          userAchievements: {
            select: { achievementId: true },
          },
        },
      }),
    ]);

    if (!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (reward.householdId !== householdId) {
      return NextResponse.json(
        { error: "Reward belongs to different household" },
        { status: 403 }
      );
    }

    if (!reward.isActive) {
      return NextResponse.json({ error: "Reward is not available" }, { status: 400 });
    }

    const now = new Date();
    if (reward.availableFrom && now < reward.availableFrom) {
      return NextResponse.json({ error: "Reward is not available yet" }, { status: 400 });
    }

    if (reward.availableUntil && now > reward.availableUntil) {
      return NextResponse.json({ error: "Reward is no longer available" }, { status: 400 });
    }

    if (user.xp < reward.pointsCost) {
      return NextResponse.json({ error: "Not enough XP" }, { status: 400 });
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
          { error: "Required achievement not unlocked" },
          { status: 400 }
        );
      }
    }

    if (reward.stock !== null && reward.stock <= 0) {
      return NextResponse.json({ error: "Reward out of stock" }, { status: 400 });
    }

    const singlePurchaseCategories = new Set(["THEME", "TITLE", "AVATAR", "BADGE"]);
    if (singlePurchaseCategories.has(reward.category)) {
      const existingClaim = await prisma.claimedReward.findFirst({
        where: {
          userId: session.user.id,
          rewardId: reward.id,
        },
        select: { id: true },
      });

      if (existingClaim) {
        return NextResponse.json(
          { error: "Ta nagroda została już kupiona" },
          { status: 400 }
        );
      }
    }

    const effectData = parseEffectData(reward.effectData);
    const autoActivates =
      reward.category === "THEME" ||
      reward.category === "TITLE" ||
      reward.category === "PERK";
    const expiresAt = autoActivates ? getDurationExpiry(reward.effectData, now) : null;
    const maxUses = effectData.uses && effectData.uses > 0 ? effectData.uses : null;

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: { xp: { decrement: reward.pointsCost } },
      });

      const claimedReward = await tx.claimedReward.create({
        data: {
          userId: session.user.id,
          rewardId: reward.id,
          isActive: autoActivates,
          fulfilled: autoActivates,
          activatedAt: autoActivates ? now : null,
          expiresAt,
          maxUses,
          usedCount: autoActivates ? 1 : 0,
        },
        include: {
          reward: true,
        },
      });

      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: reward.id },
          data: { stock: { decrement: 1 } },
        });
      }

      await tx.pointsHistory.create({
        data: {
          userId: session.user.id,
          amount: -reward.pointsCost,
          reason: `Zakup nagrody: ${reward.name}`,
          type: "SPENT",
        },
      });

      if (reward.category === "THEME" && autoActivates) {
        await tx.claimedReward.updateMany({
          where: {
            userId: session.user.id,
            isActive: true,
            id: { not: claimedReward.id },
            reward: { category: "THEME" },
          },
          data: { isActive: false },
        });

        await tx.user.update({
          where: { id: session.user.id },
          data: { activeTheme: effectData.themeId || reward.id },
        });
      }

      if (reward.category === "TITLE" && autoActivates) {
        await tx.claimedReward.updateMany({
          where: {
            userId: session.user.id,
            isActive: true,
            id: { not: claimedReward.id },
            reward: { category: "TITLE" },
          },
          data: { isActive: false },
        });

        await tx.user.update({
          where: { id: session.user.id },
          data: { activeTitle: effectData.titleId || reward.id },
        });
      }

      return claimedReward;
    });

    return NextResponse.json({
      success: true,
      claimedReward: result,
      activatedAutomatically: autoActivates,
    });
  } catch (error) {
    console.error("Error purchasing reward:", error);
    return NextResponse.json(
      { error: "Failed to purchase reward" },
      { status: 500 }
    );
  }
}
