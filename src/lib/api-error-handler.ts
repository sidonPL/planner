import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Helper do obsługi błędów w API routes
 * Zwraca odpowiednie response w zależności od typu błędu
 */

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      },
      { status: 400 }
    );
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Duplicate entry',
          field: error.meta?.target,
          message: 'Ten element już istnieje w bazie danych',
        },
        { status: 409 }
      );
    }

    // Foreign key constraint violation
    if (error.code === 'P2003') {
      return NextResponse.json(
        {
          error: 'Foreign key constraint failed',
          message: 'Powiązany element nie istnieje',
        },
        { status: 400 }
      );
    }

    // Record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Nie znaleziono żądanego elementu',
        },
        { status: 404 }
      );
    }

    // Generic Prisma error
    return NextResponse.json(
      {
        error: 'Database error',
        message: 'Wystąpił błąd bazy danych',
        code: error.code,
      },
      { status: 500 }
    );
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: 'Validation error',
        message: 'Nieprawidłowe dane wejściowe',
      },
      { status: 400 }
    );
  }

  // Generic errors
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Wystąpił błąd serwera';

    return NextResponse.json(
      {
        error: 'Internal server error',
        message,
      },
      { status: 500 }
    );
  }

  // Unknown error
  return NextResponse.json(
    {
      error: 'Unknown error',
      message: 'Wystąpił nieznany błąd',
    },
    { status: 500 }
  );
}

/**
 * Wrapper dla API route handlers z obsługą błędów
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  return handler().catch(handleApiError);
}

/**
 * Helper do walidacji autoryzacji
 */
export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Helper do walidacji uprawnień
 */
export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Helper do not found responses
 */
export function notFound(message = 'Not found'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Helper do bad request responses
 */
export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      error: 'Bad request',
      message,
      details,
    },
    { status: 400 }
  );
}

/**
 * Helper do success responses
 */
export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Helper do created responses
 */
export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/**
 * Helper do no content responses
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

