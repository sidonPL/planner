import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify password before deletion (get from request body)
    const body = await request.json();
    const { password, confirmText } = body;

    if (!password || confirmText !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        { error: 'Invalid confirmation' },
        { status: 400 }
      );
    }

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: 'Password verification failed' },
        { status: 400 }
      );
    }

    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Log account deletion in audit log
    if (session.user.householdId) {
      await prisma.auditLog.create({
        data: {
          action: 'DELETE',
          entityType: 'User',
          entityId: userId,
          entityName: session.user.email || 'Unknown',
          userId,
          householdId: session.user.householdId,
          metadata: {
            type: 'ACCOUNT_DELETED',
            timestamp: new Date().toISOString(),
            userEmail: session.user.email,
          },
        },
      });
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Sign out the user
    // Note: signOut will be handled on client side after successful response

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

