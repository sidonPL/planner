import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Centralne zarządzanie błędami API
 * Konwertuje różne typy błędów na spójne odpowiedzi HTTP
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Błędy Zod (walidacja)
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation error",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  // Błędy Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return NextResponse.json(
          {
            error: "Rekord z tymi danymi już istnieje",
            field: error.meta?.target,
          },
          { status: 409 }
        );
      case "P2025":
        return NextResponse.json(
          { error: "Nie znaleziono rekordu" },
          { status: 404 }
        );
      case "P2003":
        return NextResponse.json(
          { error: "Naruszenie integralności danych" },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          { error: "Błąd bazy danych", code: error.code },
          { status: 500 }
        );
    }
  }

  // Błędy Prisma - validation
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      { error: "Błąd walidacji danych" },
      { status: 400 }
    );
  }

  // Standardowe błędy JS
  if (error instanceof Error) {
    // Nie ujawniaj szczegółów błędu w produkcji
    const isDevelopment = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        error: "Wewnętrzny błąd serwera",
        ...(isDevelopment && { message: error.message, stack: error.stack }),
      },
      { status: 500 }
    );
  }

  // Nieznany błąd
  return NextResponse.json(
    { error: "Nieznany błąd serwera" },
    { status: 500 }
  );
}

/**
 * Wrapper dla API handlers z automatyczną obsługą błędów
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Helper do sukcesu API
 */
export function apiSuccess<T = unknown>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Helper do błędów API
 */
export function apiError(
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  const response: { error: string; details?: unknown } = {
    error: message,
  };

  if (details) {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Parsuj i waliduj JSON body z request
 */
export async function parseJsonBody<T = unknown>(
  request: Request
): Promise<T | null> {
  try {
    const contentType = request.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      return null;
    }

    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Sprawdź czy użytkownik ma dostęp do zasobu gospodarstwa
 */
export function checkHouseholdAccess(
  userHouseholdId: string | null,
  resourceHouseholdId: string
): boolean {
  return userHouseholdId === resourceHouseholdId;
}

