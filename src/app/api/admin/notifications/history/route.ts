import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type NotificationHistoryItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: Date;
  recipientCount: number;
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get broadcast notifications (system type sent to multiple users)
    const notifications = await prisma.notification.findMany({
      where: {
        type: 'SYSTEM',
      },
      take: 50,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        createdAt: true,
      },
    });

    // Group by title+message to get broadcast count
    const grouped = notifications.reduce<NotificationHistoryItem[]>((acc, notif) => {
      const existing = acc.find(
        (n) => n.title === notif.title && n.message === notif.message
      );
      if (existing) {
        existing.recipientCount++;
      } else {
        acc.push({
          ...notif,
          recipientCount: 1,
        });
      }
      return acc;
    }, []);

    return NextResponse.json({ history: grouped });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

