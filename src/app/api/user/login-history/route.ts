import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pobierz ostatnie 10 logowań z audit log
    const loginHistory = await prisma.auditLog.findMany({
      where: {
        userId: session.user.id,
        action: 'LOGIN',
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        action: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    return NextResponse.json({ history: loginHistory });
  } catch (error) {
    console.error('Error fetching login history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

