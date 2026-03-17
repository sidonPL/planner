import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { isPublic } = await request.json();

    await prisma.recipe.update({
      where: { id },
      data: { isPublic },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling recipe public status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

