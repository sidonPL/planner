import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RewardEffectData = {
  duration?: number;
  themeId?: string;
  titleId?: string;
  type?: string;
  multiplier?: number;
};

type ActivationMetadata = {
  themeId?: string;
};

type ActivationBody = {
  metadata?: ActivationMetadata;
};

function parseEffectData(effectData: unknown): RewardEffectData {
  if (!effectData || typeof effectData !== "object") {
    return {};
  }

  return effectData as RewardEffectData;
}

/**
 * POST /api/gamification/claimed-rewards/[id]/activate
 * Aktywuje nagrodę użytkownika.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    let body: ActivationBody;
    try {
      body = (await request.json()) as ActivationBody;
    } catch {
      body = {};
    }

    const claimedReward = await prisma.claimedReward.findUnique({
      where: { id },
      include: { reward: true },
    });

    if (!claimedReward || claimedReward.userId !== session.user.id) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    if (claimedReward.maxUses && claimedReward.usedCount >= claimedReward.maxUses) {
      return NextResponse.json(
        { error: "Maximum uses reached" },
        { status: 400 }
      );
    }

    const reward = claimedReward.reward;
    const metadata = body.metadata;
    const effectData = parseEffectData(reward.effectData);
    const now = new Date();

    const expiresAt =
      effectData.duration && effectData.duration > 0
        ? new Date(now.getTime() + effectData.duration * 1000)
        : null;

    const nextMetadata =
      metadata !== undefined
        ? (metadata as Prisma.InputJsonValue)
        : claimedReward.metadata === null
          ? Prisma.JsonNull
          : (claimedReward.metadata as Prisma.InputJsonValue);

    const result = await prisma.$transaction(async (tx) => {
      if (reward.category === "THEME") {
        await tx.claimedReward.updateMany({
          where: {
            userId: session.user.id,
            isActive: true,
            id: { not: claimedReward.id },
            reward: { category: "THEME" },
          },
          data: { isActive: false },
        });

        const themeId = metadata?.themeId || effectData.themeId || reward.id;
        await tx.user.update({
          where: { id: session.user.id },
          data: { activeTheme: themeId },
        });
      }

      if (reward.category === "TITLE") {
        await tx.claimedReward.updateMany({
          where: {
            userId: session.user.id,
            isActive: true,
            id: { not: claimedReward.id },
            reward: { category: "TITLE" },
          },
          data: { isActive: false },
        });

        const titleId = effectData.titleId || reward.id;
        await tx.user.update({
          where: { id: session.user.id },
          data: { activeTitle: titleId },
        });
      }

      if (reward.category === "PERK" && effectData.type === "xp_boost") {
        console.log(`XP Boost activated: ${effectData.multiplier ?? 1}x`);
      }

      const updated = await tx.claimedReward.update({
        where: { id },
        data: {
          isActive: true,
          activatedAt: now,
          expiresAt,
          usedCount: { increment: 1 },
          metadata: nextMetadata,
        },
        include: { reward: true },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      claimedReward: result,
      message: "Nagroda została aktywowana",
    });
  } catch (error) {
    console.error("Error activating reward:", error);
    return NextResponse.json(
      { error: "Failed to activate reward" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gamification/claimed-rewards/[id]/activate
 * Deaktywuje nagrodę użytkownika.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const claimedReward = await prisma.claimedReward.findUnique({
      where: { id },
      include: { reward: true },
    });

    if (!claimedReward || claimedReward.userId !== session.user.id) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    const reward = claimedReward.reward;

    await prisma.$transaction(async (tx) => {
      await tx.claimedReward.update({
        where: { id },
        data: { isActive: false },
      });

      if (reward.category === "THEME") {
        await tx.user.update({
          where: { id: session.user.id },
          data: { activeTheme: "default" },
        });
      }

      if (reward.category === "TITLE") {
        await tx.user.update({
          where: { id: session.user.id },
          data: { activeTitle: null },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Nagroda została deaktywowana",
    });
  } catch (error) {
    console.error("Error deactivating reward:", error);
    return NextResponse.json(
      { error: "Failed to deactivate reward" },
      { status: 500 }
    );
  }
}
