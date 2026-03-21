import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AVAILABLE_THEMES, ThemeId } from "@/lib/themes";
import { AVAILABLE_TITLES, TitleId } from "@/lib/titles";
import { resolveThemeIdFromRewardData } from "@/lib/theme-reward-utils";

type RewardEffectData = {
  duration?: number;
  themeId?: string;
  titleId?: string;
  avatarUrl?: string;
  avatarId?: string;
  badgeId?: string;
  type?: string;
  multiplier?: number;
};

type ActivationMetadata = {
  themeId?: string;
  previousAvatar?: string | null;
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

function resolveThemeId(effectData: RewardEffectData, rewardName?: string | null, metadata?: ActivationMetadata): ThemeId {
  const metaTheme = metadata?.themeId;
  if (metaTheme && AVAILABLE_THEMES[metaTheme as ThemeId]) {
    return metaTheme as ThemeId;
  }

  const resolved = resolveThemeIdFromRewardData({ effectData, name: rewardName });
  if (resolved) return resolved;

  return 'default';
}

function resolveTitleId(effectData: RewardEffectData): TitleId | null {
  const id = effectData.titleId;
  if (!id) return null;
  return AVAILABLE_TITLES[id as TitleId] ? (id as TitleId) : null;
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
    let metadataForSave = metadata;

    const expiresAt =
      effectData.duration && effectData.duration > 0
        ? new Date(now.getTime() + effectData.duration * 1000)
        : null;

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

        const themeId = resolveThemeId(effectData, reward.name, metadata);
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

        const titleId = resolveTitleId(effectData);
        await tx.user.update({
          where: { id: session.user.id },
          data: { activeTitle: titleId },
        });
      }

      if (reward.category === "BADGE") {
        await tx.claimedReward.updateMany({
          where: {
            userId: session.user.id,
            isActive: true,
            id: { not: claimedReward.id },
            reward: { category: "BADGE" },
          },
          data: { isActive: false },
        });
      }

      if (reward.category === "AVATAR") {
        await tx.claimedReward.updateMany({
          where: {
            userId: session.user.id,
            isActive: true,
            id: { not: claimedReward.id },
            reward: { category: "AVATAR" },
          },
          data: { isActive: false },
        });

        const user = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { avatar: true },
        });

        const avatarFromEffect = effectData.avatarUrl || null;
        if (avatarFromEffect) {
          await tx.user.update({
            where: { id: session.user.id },
            data: { avatar: avatarFromEffect },
          });
        }

        if (!metadata?.previousAvatar) {
          metadataForSave = {
            ...metadata,
            previousAvatar: user?.avatar || null,
          };
        }
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
          metadata:
            metadataForSave !== undefined
              ? (metadataForSave as Prisma.InputJsonValue)
              : claimedReward.metadata === null
                ? Prisma.JsonNull
                : (claimedReward.metadata as Prisma.InputJsonValue),
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

      if (reward.category === "AVATAR") {
        const previousAvatar =
          claimedReward.metadata && typeof claimedReward.metadata === "object" && "previousAvatar" in claimedReward.metadata
            ? ((claimedReward.metadata as Record<string, unknown>).previousAvatar as string | null)
            : null;

        if (previousAvatar !== undefined) {
          await tx.user.update({
            where: { id: session.user.id },
            data: { avatar: previousAvatar || null },
          });
        }
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
