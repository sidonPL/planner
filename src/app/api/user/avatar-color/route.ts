import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/user/avatar-color
 * Update user's avatar color
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { color } = body;

    if (!color || typeof color !== 'string') {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
    }

    // Validate hex color format
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json({ error: 'Invalid color format' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { color }, // Using existing 'color' field
    });

    return NextResponse.json({ success: true, color });
  } catch (error) {
    console.error('Error updating avatar color:', error);
    return NextResponse.json(
      { error: 'Failed to update avatar color' },
      { status: 500 }
    );
  }
}

