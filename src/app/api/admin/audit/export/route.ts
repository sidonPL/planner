import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Create CSV
    const headers = ['Data', 'Użytkownik', 'Email', 'Akcja', 'Typ Encji', 'Entity ID', 'IP', 'User Agent'];
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.name || 'N/A',
      log.user?.email || 'N/A',
      log.action,
      log.entityType,
      log.entityId || 'N/A',
      log.ipAddress || 'N/A',
      log.userAgent || 'N/A',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

