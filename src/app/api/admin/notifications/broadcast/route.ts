import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, message, type, target } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Get target users based on filter
    let users;
    switch (target) {
      case 'admins':
        users = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true, householdId: true },
        });
        break;
      case 'active':
        users = await prisma.user.findMany({
          where: {
            lastActivityDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          select: { id: true, householdId: true },
        });
        break;
      default: // 'all'
        users = await prisma.user.findMany({
          select: { id: true, householdId: true },
        });
    }

    // Send notification to all target users
    await Promise.all(
      users.map((user) =>
        createNotification({
          userId: user.id,
          householdId: user.householdId,
          title,
          message,
          type: type || 'SYSTEM',
        })
      )
    );

    return NextResponse.json({
      success: true,
      recipientCount: users.length,
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

