import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AVAILABLE_THEMES, ThemeId } from '@/lib/themes';
import { resolveThemeIdFromRewardData } from '@/lib/theme-reward-utils';

/**
 * POST /api/gamification/theme
 * Zmienia aktywny motyw użytkownika
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { themeId } = await request.json();

    // Walidacja themeId
    if (!themeId || !AVAILABLE_THEMES[themeId as ThemeId]) {
      return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 });
    }

    const theme = AVAILABLE_THEMES[themeId as ThemeId];

    // Sprawdź czy użytkownik ma dostęp do motywu
    if (!theme.free) {
      const claimedRewards = await prisma.claimedReward.findMany({
        where: {
          userId: session.user.id,
          reward: { category: 'THEME' },
        },
        select: { reward: { select: { effectData: true, name: true } } },
      });

      const hasAccess = claimedRewards.some((cr) =>
        resolveThemeIdFromRewardData({
          effectData: cr.reward.effectData,
          name: cr.reward.name,
        }) === themeId
      );

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Theme not unlocked' },
          { status: 403 }
        );
      }
    }

    // Zapisz aktywny motyw
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeTheme: themeId },
    });

    return NextResponse.json({
      success: true,
      theme: {
        id: themeId,
        name: theme.name,
      },
    });
  } catch (error) {
    console.error('Error changing theme:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gamification/theme
 * Pobiera aktywny motyw użytkownika
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeTheme: true },
    });

    const rawThemeId = user?.activeTheme as ThemeId | null;
    const themeId: ThemeId = rawThemeId && AVAILABLE_THEMES[rawThemeId] ? rawThemeId : 'default';
    const theme = AVAILABLE_THEMES[themeId];

    return NextResponse.json({
      themeId,
      theme: {
        id: themeId,
        name: theme.name,
        description: theme.description,
        icon: theme.icon,
      },
    });
  } catch (error) {
    console.error('Error fetching theme:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

