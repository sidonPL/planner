import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { addXP } from '@/lib/xp';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, reason } = await request.json();

    if (!amount || !reason) {
      return NextResponse.json(
        { error: 'Amount and reason are required' },
        { status: 400 }
      );
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    // Award XP to all users
    await Promise.all(
      users.map((user) =>
        addXP(user.id, amount, reason, 'BONUS')
      )
    );

    return NextResponse.json({
      success: true,
      usersCount: users.length,
      amount,
    });
  } catch (error) {
    console.error('Error bulk awarding XP:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

