import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST - przypnij osiągnięcie
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: achievementId } = await params;

    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: session.user.id,
          achievementId,
        },
      },
      select: { id: true, isPinned: true },
    });

    if (!userAchievement) {
      return NextResponse.json(
        { error: 'Możesz przypinać tylko odblokowane osiągnięcia' },
        { status: 400 }
      );
    }

    if (userAchievement.isPinned) {
      return NextResponse.json({ success: true, alreadyPinned: true });
    }

    const pinnedCount = await prisma.userAchievement.count({
      where: {
        userId: session.user.id,
        isPinned: true,
      },
    });

    if (pinnedCount >= 3) {
      return NextResponse.json(
        { error: 'Możesz przypiąć maksymalnie 3 osiągnięcia' },
        { status: 400 }
      );
    }

    await prisma.userAchievement.update({
      where: {
        userId_achievementId: {
          userId: session.user.id,
          achievementId,
        },
      },
      data: { isPinned: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error pinning achievement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - odepnij osiągnięcie
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: achievementId } = await params;

    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: session.user.id,
          achievementId,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Nie znaleziono odblokowanego osiągnięcia do odpięcia' },
        { status: 404 }
      );
    }

    await prisma.userAchievement.update({
      where: {
        userId_achievementId: {
          userId: session.user.id,
          achievementId,
        },
      },
      data: { isPinned: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unpinning achievement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


