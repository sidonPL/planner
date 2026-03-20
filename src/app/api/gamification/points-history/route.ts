import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const POINT_TYPES = ['EARNED', 'SPENT', 'BONUS', 'PENALTY'] as const;

// GET - pobierz historię punktów użytkownika
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type'); // EARNED, SPENT, BONUS, PENALTY

    const where: Prisma.PointsHistoryWhereInput = {
      userId: session.user.id,
    };

    if (type && POINT_TYPES.includes(type as (typeof POINT_TYPES)[number])) {
      where.type = type as Prisma.PointsHistoryWhereInput['type'];
    }

    const history = await prisma.pointsHistory.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching points history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

