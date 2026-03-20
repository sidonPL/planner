import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { AuditAction, Prisma } from '@prisma/client';

/**
 * Admin Audit Log API
 * GET /api/admin/audit
 * Lista wszystkich audit logów z filtrami i paginacją
 */
export async function GET(request: Request) {
  // Check admin auth
  const sessionOrError = await requireAdmin();
  if (sessionOrError instanceof NextResponse) {
    return sessionOrError;
  }

  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Filters
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (action && Object.values(AuditAction).includes(action as AuditAction)) {
      where.action = action as AuditAction;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (dateFrom || dateTo) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (dateFrom) {
        createdAtFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        createdAtFilter.lte = new Date(dateTo);
      }
      where.createdAt = createdAtFilter;
    }

    // Get logs with user info
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

