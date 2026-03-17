import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/gamification/claimed-rewards/[id]/activate
 * Aktywuje kupioną nagrodę
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { metadata } = body;

    // Pobierz claimed reward
    const claimedReward = await prisma.claimedReward.findUnique({
      where: { id },
      include: { reward: true },
    });

    if (!claimedReward || claimedReward.userId !== session.user.id) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    // Sprawdź czy można aktywować
    if (claimedReward.maxUses && claimedReward.usedCount >= claimedReward.maxUses) {
      return NextResponse.json(
        { error: 'Maximum uses reached' },
        { status: 400 }
      );
    }

    const reward = claimedReward.reward;
    const now = new Date();

    // Oblicz datę wygaśnięcia bazując na typie nagrody
    let expiresAt: Date | null = null;
    if (reward.effectData && typeof reward.effectData === 'object') {
      const effectData = reward.effectData as any;
      if (effectData.duration) {
        // duration w sekundach
        expiresAt = new Date(now.getTime() + effectData.duration * 1000);
      }
    }

    // Transakcja - aktywuj nagrodę i zaktualizuj użytkownika
    const result = await prisma.$transaction(async (tx) => {
      // Deaktywuj inne nagrody tego samego typu (jeśli wymagane)
      if (reward.category === 'THEME') {
        // Może być tylko jeden aktywny motyw
        await tx.claimedReward.updateMany({
          where: {
            userId: session.user.id,
            isActive: true,
            reward: { category: 'THEME' },
          },
          data: { isActive: false },
        });

        // Ustaw aktywny motyw
        const themeId =
          (metadata?.themeId as string) ||
          ((reward.effectData as any)?.themeId as string) ||
          reward.id;
        await tx.user.update({
          where: { id: session.user.id },
          data: { activeTheme: themeId },
        });
      }

      if (reward.category === 'TITLE') {
        // Może być tylko jeden aktywny tytuł
        await tx.claimedReward.updateMany({
          where: {
            userId: session.user.id,
            isActive: true,
            reward: { category: 'TITLE' },
          },
          data: { isActive: false },
        });

        // Ustaw aktywny tytuł na podstawie effectData.titleId, nie reward.name
        const titleId = (reward.effectData as any)?.titleId || reward.id;
        await tx.user.update({
          where: { id: session.user.id },
          data: { activeTitle: titleId },
        });
      }

      if (reward.category === 'PERK') {
        const effectData = reward.effectData as any;

        if (effectData?.type === 'xp_boost') {
          // XP boost jest obsługiwany przez ClaimedReward.isActive
          // Funkcja addXP automatycznie sprawdzi aktywne boosty
          console.log(`XP Boost activated: ${effectData.multiplier}x`);
        }

        if (effectData?.type === 'permanent_xp_boost') {
          // Permanent XP boost - również przez ClaimedReward.isActive
          console.log(`Permanent XP Boost activated: ${effectData.multiplier}x`);
        }

        if (effectData?.type === 'vip_status') {
          // VIP Status - combo of multiple perks
          console.log('VIP Status activated: 1.5x XP boost');
        }

        if (effectData?.type === 'streak_shield') {
          // Tarcza streaku - zapisz w metadata
          // Będzie sprawdzana gdy użytkownik przerwie streak
        }
      }

      // Aktywuj claimed reward
      const updated = await tx.claimedReward.update({
        where: { id },
        data: {
          isActive: true,
          activatedAt: now,
          expiresAt,
          // Nie inkrementuj usedCount tutaj — będzie aktualizowane tylko podczas rzeczywistego użycia
          metadata: metadata || claimedReward.metadata,
        },
        include: { reward: true },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      claimedReward: result,
      message: 'Nagroda została aktywowana',
    });
  } catch (error) {
    console.error('Error activating reward:', error);
    return NextResponse.json(
      { error: 'Failed to activate reward' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gamification/claimed-rewards/[id]/activate
 * Deaktywuje nagrodę
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Pobierz claimed reward
    const claimedReward = await prisma.claimedReward.findUnique({
      where: { id },
      include: { reward: true },
    });

    if (!claimedReward || claimedReward.userId !== session.user.id) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    const reward = claimedReward.reward;

    // Transakcja - deaktywuj nagrodę i zaktualizuj użytkownika
    await prisma.$transaction(async (tx) => {
      // Wyczyść ustawienia użytkownika
      if (reward.category === 'THEME') {
        // Theme jest obsługiwany przez ClaimedReward.isActive
        console.log(`Theme activated: ${reward.name}`);
      }

      if (reward.category === 'TITLE') {
        // Title jest obsługiwany przez ClaimedReward.isActive
        console.log(`Title activated: ${reward.name}`);
      }

      if (reward.category === 'PERK') {
        const effectData = reward.effectData as any;
        if (effectData?.type === 'xp_boost') {
          // XP boost jest dezaktywowany przez ClaimedReward.isActive = false
          console.log('XP Boost deactivated');
        }
      }

      // Deaktywuj claimed reward
      await tx.claimedReward.update({
        where: { id },
        data: { isActive: false },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Nagroda została deaktywowana',
    });
  } catch (error) {
    console.error('Error deactivating reward:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate reward' },
      { status: 500 }
    );
  }
}

