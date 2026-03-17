import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { calculateAchievementProgress } from '@/lib/achievements';

/**
 * POST /api/gamification/achievements/check-progress
 * Sprawdza progress dla podanych typów osiągnięć
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requirementTypes } = await request.json();

    if (!requirementTypes || !Array.isArray(requirementTypes)) {
      return NextResponse.json(
        { error: 'Invalid requirement types' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Znajdź osiągnięcia które użytkownik jeszcze nie ma
    const achievements = await prisma.achievement.findMany({
      where: {
        requirementType: { in: requirementTypes },
        NOT: {
          userAchievements: {
            some: { userId }
          }
        }
      },
      orderBy: [
        { tier: 'asc' },
        { requirementValue: 'asc' }
      ],
    });

    // Oblicz progress dla każdego
    const achievementsWithProgress = await Promise.all(
      achievements.map(async (achievement) => {
        const progress = await calculateAchievementProgress(
          userId,
          achievement.requirementType
        );
        const progressPercent = (progress / achievement.requirementValue) * 100;

        // Zwróć tylko te z progress > 0
        if (progress > 0) {
          return {
            id: achievement.id,
            name: achievement.name,
            icon: achievement.icon,
            category: achievement.category,
            progress,
            target: achievement.requirementValue,
            progressPercent: Math.min(progressPercent, 99),
            tierName: achievement.tierName,
          };
        }
        return null;
      })
    );

    // Filtruj null i weź maksymalnie 3 najbliższe
    const validAchievements = achievementsWithProgress
      .filter((a) => a !== null)
      .sort((a, b) => b!.progressPercent - a!.progressPercent)
      .slice(0, 3);

    return NextResponse.json({
      achievements: validAchievements,
    });
  } catch (error) {
    console.error('Error checking achievement progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
