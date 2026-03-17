import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { calculateAchievementProgress } from '@/lib/achievements';

/**
 * GET /api/gamification/achievements/tiered
 * Zwraca tiered achievements pogrupowane w serie
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Pobierz wszystkie tiered achievements
    const tieredAchievements = await prisma.achievement.findMany({
      where: {
        seriesName: { not: null },
      },
      orderBy: [
        { seriesName: 'asc' },
        { tier: 'asc' },
      ],
    });

    // Pobierz odblokowane achievements użytkownika
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: {
        achievementId: true,
        unlockedAt: true,
      },
    });

    const unlockedMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt])
    );

    // Grupuj po seriach
    const seriesMap = new Map<string, typeof tieredAchievements>();

    for (const achievement of tieredAchievements) {
      if (!achievement.seriesName) continue;

      if (!seriesMap.has(achievement.seriesName)) {
        seriesMap.set(achievement.seriesName, []);
      }
      seriesMap.get(achievement.seriesName)!.push(achievement);
    }

    // Przygotuj dane dla każdej serii
    const series = await Promise.all(
      Array.from(seriesMap.entries()).map(async ([seriesName, achievements]) => {
        const tiersWithProgress = await Promise.all(
          achievements.map(async (achievement) => {
            const unlocked = unlockedMap.has(achievement.id);
            const progress = unlocked
              ? achievement.requirementValue
              : await calculateAchievementProgress(userId, achievement.requirementType);

            return {
              id: achievement.id,
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              tier: achievement.tier,
              tierName: achievement.tierName,
              requirementValue: achievement.requirementValue,
              xpReward: achievement.xpReward,
              unlocked,
              progress,
              unlockedAt: unlockedMap.get(achievement.id) || null,
            };
          })
        );

        // Znajdź aktualny postęp serii (najwyższy postęp z nieodblokowanych)
        const nextTier = tiersWithProgress.find(t => !t.unlocked);
        const currentProgress = nextTier?.progress || tiersWithProgress[tiersWithProgress.length - 1]?.progress || 0;

        return {
          seriesName,
          icon: achievements[0]?.icon || '🏆',
          category: achievements[0]?.category || 'MASTER',
          tiers: tiersWithProgress,
          currentProgress,
          unlockedCount: tiersWithProgress.filter(t => t.unlocked).length,
          totalCount: tiersWithProgress.length,
        };
      })
    );

    // Sortuj serie po kategorii i nazwie
    series.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.seriesName.localeCompare(b.seriesName);
    });

    return NextResponse.json({ series });
  } catch (error) {
    console.error('Error fetching tiered achievements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

