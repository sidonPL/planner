import { NextResponse } from 'next/server';
import { captureException, captureMessage } from '@/lib/sentry';

/**
 * Test endpoint dla Sentry
 * Użyj w przeglądarce: /api/sentry-test?type=error
 * TYLKO DLA DEVELOPMENT - wyłączony w produkcji
 */
export async function GET(request: Request) {
  // Wyłącz w produkcji
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Endpoint dostępny tylko w trybie development' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'error';

  try {
    switch (type) {
      case 'error':
        // Test error
        throw new Error('🧪 Sentry Test Error - This is intentional!');

      case 'message':
        // Test message
        captureMessage('🧪 Sentry Test Message', {
          level: 'info',
          tags: {
            test: 'true',
            endpoint: '/api/sentry-test',
          },
        });
        return NextResponse.json({
          success: true,
          message: 'Message sent to Sentry',
        });

      case 'warning':
        captureMessage('🧪 Sentry Test Warning', {
          level: 'warning',
        });
        return NextResponse.json({
          success: true,
          message: 'Warning sent to Sentry',
        });

      default:
        return NextResponse.json({
          error: 'Unknown type. Use ?type=error or ?type=message or ?type=warning',
        });
    }
  } catch (error) {
    // This will be caught by Sentry
    captureException(error, {
      tags: {
        test: 'true',
        endpoint: '/api/sentry-test',
      },
      extra: {
        type,
        timestamp: new Date().toISOString(),
      },
    });

    // Re-throw to also test unhandled errors
    throw error;
  }
}

