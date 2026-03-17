import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pobierz użytkownika z podstawowymi statystykami
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        xp: true,
        level: true,
        createdAt: true,
        lastActivityDate: true,
        householdId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Zadania ukończone
    const tasksCompleted = await prisma.taskCompletion.count({
      where: {
        task: {
          assigneeId: session.user.id,
        },
      },
    });

    // Przepisy dodane
    const recipesCreated = await prisma.recipe.count({
      where: {
        createdById: session.user.id,
      },
    });

    // Wydarzenia utworzone (dla całego gospodarstwa)
    const eventsCreated = await prisma.event.count({
      where: {
        householdId: user.householdId || undefined,
      },
    });

    // Dni aktywności
    const daysActive = user.lastActivityDate
      ? differenceInDays(user.lastActivityDate, user.createdAt)
      : 0;

    return NextResponse.json({
      stats: {
        tasksCompleted,
        recipesCreated,
        eventsCreated,
        xpEarned: user.xp,
        level: user.level,
        daysActive,
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

