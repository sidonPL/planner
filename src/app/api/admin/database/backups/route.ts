import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Placeholder backups list
    const backups = [
      {
        id: '1',
        filename: 'planner-backup-2026-01-01T00-00-00.sql',
        size: '45 MB',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: '2',
        filename: 'planner-backup-2025-12-31T00-00-00.sql',
        size: '42 MB',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];

    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

