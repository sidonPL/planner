/**
 * Utility dla obslugi bledow i komunikatow (Error handling and messages utility)
 */

import { toast } from "sonner";

/**
 * Error types
 */
export enum ErrorType {
  VALIDATION = "validation",
  NETWORK = "network",
  AUTH = "auth",
  NOT_FOUND = "not_found",
  SERVER = "server",
  UNKNOWN = "unknown",
}

/**
 * Error structure
 */
export interface AppError {
  type: ErrorType;
  message: string;
  details?: unknown;
  statusCode?: number;
}

/**
 * Parse API error and return user-friendly message
 */
export function parseApiError(error: unknown): AppError {
  // Fetch error
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      type: ErrorType.NETWORK,
      message: "Brak polaczenia z serwerem. Sprawdz polaczenie internetowe.",
    };
  }

  // Response error
  if (error instanceof Response) {
    switch (error.status) {
      case 400:
        return {
          type: ErrorType.VALIDATION,
          message: "Nieprawidlowe dane. Sprawdz formularz.",
          statusCode: 400,
        };
      case 401:
        return {
          type: ErrorType.AUTH,
          message: "Sesja wygasla. Zaloguj sie ponownie.",
          statusCode: 401,
        };
      case 403:
        return {
          type: ErrorType.AUTH,
          message: "Brak uprawnien do wykonania tej akcji.",
          statusCode: 403,
        };
      case 404:
        return {
          type: ErrorType.NOT_FOUND,
          message: "Nie znaleziono zasobu.",
          statusCode: 404,
        };
      case 500:
      case 502:
      case 503:
        return {
          type: ErrorType.SERVER,
          message: "Blad serwera. Sprobuj ponownie pozniej.",
          statusCode: error.status,
        };
      default:
        return {
          type: ErrorType.UNKNOWN,
          message: "Wystapil nieoczekiwany blad.",
          statusCode: error.status,
        };
    }
  }

  // Error object
  if (error instanceof Error) {
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      details: error,
    };
  }

  // Unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: "Wystapil nieoczekiwany blad.",
    details: error,
  };
}

/**
 * Show error toast
 */
export function showErrorToast(error: unknown, customMessage?: string): void {
  const appError = parseApiError(error);
  const message = customMessage || appError.message;

  toast.error(message, {
    description: appError.statusCode ? `Kod bledu: ${appError.statusCode}` : undefined,
    duration: 5000,
  });

  // Log for development
  if (process.env.NODE_ENV === "development") {
    console.error("Error details:", appError);
  }
}

/**
 * Show success toast
 */
export function showSuccessToast(
  message: string,
  description?: string
): void {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

/**
 * Show info toast
 */
export function showInfoToast(message: string, description?: string): void {
  toast.info(message, {
    description,
    duration: 4000,
  });
}

/**
 * Show warning toast
 */
export function showWarningToast(
  message: string,
  description?: string
): void {
  toast.warning(message, {
    description,
    duration: 4000,
  });
}

/**
 * Wrapper for async operations with error handling
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (result: T) => void;
    onError?: (error: AppError) => void;
  }
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  try {
    const result = await operation();

    if (options?.successMessage) {
      showSuccessToast(options.successMessage);
    }

    options?.onSuccess?.(result);

    return { success: true, data: result };
  } catch (error) {
    const appError = parseApiError(error);

    if (options?.errorMessage) {
      showErrorToast(error, options.errorMessage);
    } else {
      showErrorToast(error);
    }

    options?.onError?.(appError);

    return { success: false, error: appError };
  }
}

/**
 * Retry logic for failed requests
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry for 4xx errors (client errors)
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before next attempt (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}

