import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AVAILABLE_TITLES, TitleId } from '@/lib/titles';

/**
 * POST /api/gamification/title
 * Zmienia aktywny tytuł użytkownika
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { titleId } = await request.json();

    // Walidacja titleId (null is allowed to remove title)
    if (titleId !== null && (!titleId || !AVAILABLE_TITLES[titleId as TitleId])) {
      return NextResponse.json({ error: 'Invalid title ID' }, { status: 400 });
    }

    if (titleId) {
      const title = AVAILABLE_TITLES[titleId as TitleId];

      // Sprawdź czy użytkownik ma dostęp do tytułu
      if (!title.free) {
        const claimedReward = await prisma.claimedReward.findFirst({
          where: {
            userId: session.user.id,
            reward: {
              category: 'TITLE',
              effectData: {
                path: ['titleId'],
                equals: titleId,
              },
            },
          },
        });

        if (!claimedReward) {
          return NextResponse.json(
            { error: 'Title not unlocked' },
            { status: 403 }
          );
        }
      }
    }

    // Zapisz aktywny tytuł
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeTitle: titleId },
    });

    return NextResponse.json({
      success: true,
      title: titleId ? {
        id: titleId,
        name: AVAILABLE_TITLES[titleId as TitleId].name,
      } : null,
    });
  } catch (error) {
    console.error('Error changing title:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gamification/title
 * Pobiera aktywny tytuł użytkownika
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeTitle: true },
    });

    const titleId = user?.activeTitle as TitleId | null;

    if (!titleId || !AVAILABLE_TITLES[titleId]) {
      return NextResponse.json({
        titleId: null,
        title: null,
      });
    }

    const title = AVAILABLE_TITLES[titleId];

    return NextResponse.json({
      titleId,
      title: {
        id: titleId,
        name: title.name,
        description: title.description,
        icon: title.icon,
        color: title.color,
      },
    });
  } catch (error) {
    console.error('Error fetching title:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

