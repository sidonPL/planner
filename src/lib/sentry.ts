import * as Sentry from "@sentry/nextjs";

/**
 * Bezpieczne logowanie błędów do Sentry
 * Używaj tego zamiast console.error w produkcji
 */
export function captureException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: "fatal" | "error" | "warning" | "info" | "debug";
    user?: {
      id?: string;
      email?: string;
      username?: string;
    };
  }
) {
  // W development tylko loguj do konsoli
  if (process.env.NODE_ENV === "development") {
    console.error("[Dev Error]", error, context);
    return;
  }

  // W production wysyłaj do Sentry
  Sentry.withScope((scope) => {
    // Dodaj context tags
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Dodaj extra data
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    // Set level
    if (context?.level) {
      scope.setLevel(context.level);
    }

    // Set user context
    if (context?.user) {
      scope.setUser(context.user);
    }

    // Capture the exception
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      // Handle non-Error objects
      Sentry.captureException(new Error(String(error)));
    }
  });
}

/**
 * Bezpieczne logowanie wiadomości do Sentry
 */
export function captureMessage(
  message: string,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: "fatal" | "error" | "warning" | "info" | "debug";
  }
) {
  if (process.env.NODE_ENV === "development") {
    console.log("[Dev Message]", message, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureMessage(message, context?.level || "info");
  });
}

/**
 * Set user context dla wszystkich przyszłych błędów
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}) {
  Sentry.setUser(user);
}

/**
 * Clear user context (np. przy logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Dodaj breadcrumb - ślad nawigacji użytkownika
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: "info",
    timestamp: Date.now() / 1000,
  });
}

/**
 * Wrapper dla async funkcji z automatycznym error handling
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: {
    name?: string;
    tags?: Record<string, string>;
  }
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, {
        tags: {
          function: options?.name || fn.name,
          ...options?.tags,
        },
        extra: {
          arguments: args,
        },
      });
      throw error; // Re-throw aby zachować normalny flow
    }
  }) as T;
}

