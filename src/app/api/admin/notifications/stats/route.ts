import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const total = await prisma.notification.count();
    const read = await prisma.notification.count({ where: { isRead: true } });
    const unread = total - read;

    const todaySent = await prisma.notification.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    return NextResponse.json({
      stats: {
        total,
        read,
        unread,
        todaySent,
      },
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

