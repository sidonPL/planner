import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Execute VACUUM on PostgreSQL
    // Note: This requires raw SQL execution
    await prisma.$executeRawUnsafe('VACUUM ANALYZE;');

    return NextResponse.json({ success: true, message: 'VACUUM completed' });
  } catch (error) {
    console.error('Error executing VACUUM:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

