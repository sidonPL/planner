import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@prisma/client';
import type { Session } from 'next-auth';

// Typ pomocniczy dla sesji admina - pewność że session nie jest null
type AdminSession = Session & { user: NonNullable<Session['user']> };

/**
 * Middleware do sprawdzenia uprawnień admina
 * Użyj w każdym admin API route
 */
export async function requireAdmin(): Promise<NextResponse | AdminSession> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  return session;
}

/**
 * Log admin action do audit log
 */
export async function logAdminAction(params: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  changes?: {
    before?: unknown;
    after?: unknown;
  };
  request?: Request;
  successful?: boolean;
  errorMessage?: string;
}) {
  const {
    userId,
    action,
    entityType,
    entityId,
    changes,
    request,
    successful = true,
    errorMessage,
  } = params;

  try {
    // Prepare metadata
    let metadataObj: Record<string, unknown> = changes || {};
    if (!successful && errorMessage) {
      metadataObj = { ...metadataObj, successful: false, error: errorMessage };
    } else if (!changes && errorMessage) {
      metadataObj = { error: errorMessage };
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId || undefined,
        metadata: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : undefined,
        ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || undefined,
        userAgent: request?.headers.get('user-agent') || undefined,
      },
    });
  } catch (error) {
    // Don't throw - logging shouldn't break the app
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Wrapper dla admin API routes z automatycznym auth + logging
 */
export function withAdminAuth<T>(
  handler: (request: Request, session: AdminSession) => Promise<T>,
  options?: {
    action?: AuditAction;
    entityType?: string;
  }
) {
  return async (request: Request) => {
    // 1. Check admin auth
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const session = sessionOrError;

    try {
      // 2. Execute handler
      const result = await handler(request, session);

      // 3. Log success
      if (options?.action && options?.entityType) {
        await logAdminAction({
          userId: session.user.id,
          action: options.action,
          entityType: options.entityType,
          request,
          successful: true,
        });
      }

      return result;
    } catch (error) {
      // 4. Log failure
      if (options?.action && options?.entityType) {
        await logAdminAction({
          userId: session.user.id,
          action: options.action,
          entityType: options.entityType,
          request,
          successful: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      throw error;
    }
  };
}

