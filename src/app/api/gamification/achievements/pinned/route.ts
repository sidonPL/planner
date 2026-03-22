import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET - pobierz przypięte osiągnięcia użytkownika
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pinned = await prisma.userAchievement.findMany({
      where: {
        userId: session.user.id,
        isPinned: true,
      },
      include: {
        achievement: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            category: true,
            xpReward: true,
          },
        },
      },
      orderBy: {
        unlockedAt: 'desc',
      },
      take: 3,
    });

    const result = pinned.map((entry) => ({
      id: entry.achievement.id,
      name: entry.achievement.name,
      description: entry.achievement.description,
      icon: entry.achievement.icon,
      category: entry.achievement.category,
      xpReward: entry.achievement.xpReward,
      unlockedAt: entry.unlockedAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching pinned achievements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

