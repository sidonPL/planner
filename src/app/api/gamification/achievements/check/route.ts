import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkAchievements, checkAndAwardCookingAchievements } from '@/lib/achievements';

/**
 * POST /api/gamification/achievements/check
 * Sprawdź i przyznaj nowe osiągnięcia użytkownikowi
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sprawdź standardowe osiągnięcia (zadania, streaki)
    const standardAchievements = await checkAchievements(session.user.id);

    // Sprawdź osiągnięcia kulinarne
    const cookingResult = await checkAndAwardCookingAchievements(session.user.id);

    // Połącz wszystkie nowe osiągnięcia
    const allNewAchievements = [
      ...standardAchievements,
      ...cookingResult.awarded,
    ];

    return NextResponse.json({
      newAchievements: allNewAchievements,
      count: allNewAchievements.length,
      stats: cookingResult.stats,
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

