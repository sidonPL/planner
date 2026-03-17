import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, this would use pg_dump or similar
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `planner-backup-${timestamp}.sql`;

    // Placeholder SQL content
    const sqlContent = `-- Planner Database Backup
-- Created: ${new Date().toISOString()}
-- Database: planner

-- TODO: Implement actual pg_dump integration
-- Example command: pg_dump -h localhost -U user -d planner > backup.sql

-- This is a placeholder backup
`;

    return new NextResponse(sqlContent, {
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

