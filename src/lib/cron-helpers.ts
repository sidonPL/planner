import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware do autoryzacji CRON jobów
 * Weryfikuje CRON_SECRET w headerze Authorization
 */
export function validateCronRequest(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Sprawdź czy CRON_SECRET jest ustawiony
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured in environment variables");
    return NextResponse.json(
      { error: "CRON jobs are not configured" },
      { status: 503 }
    );
  }

  // Sprawdź czy header Authorization jest obecny
  if (!authHeader) {
    console.warn("CRON job called without Authorization header");
    return NextResponse.json(
      { error: "Unauthorized - Missing Authorization header" },
      { status: 401 }
    );
  }

  // Sprawdź format Bearer token
  const token = authHeader.replace("Bearer ", "");

  if (token !== cronSecret) {
    console.warn("CRON job called with invalid token");
    return NextResponse.json(
      { error: "Unauthorized - Invalid CRON secret" },
      { status: 401 }
    );
  }

  // Autoryzacja udana
  return null;
}

/**
 * Wrapper dla CRON handler functions z automatyczną autoryzacją
 */
export function withCronAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Sprawdź autoryzację
    const authError = validateCronRequest(request);
    if (authError) {
      return authError;
    }

    try {
      // Wywołaj właściwy handler
      return await handler(request);
    } catch (error) {
      console.error("CRON job error:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Logger dla CRON jobów z timestampem
 */
export function logCronJob(jobName: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const logData = data ? ` - ${JSON.stringify(data)}` : '';
  console.log(`[CRON:${jobName}] ${timestamp}: ${message}${logData}`);
}

/**
 * Helper do tworzenia response dla CRON jobów
 */
export function cronResponse(
  jobName: string,
  success: boolean,
  data?: unknown
): NextResponse {
  const response: { job: string; timestamp: string; success: boolean; data?: unknown } = {
    job: jobName,
    timestamp: new Date().toISOString(),
    success,
  };

  if (data) {
    response.data = data;
  }

  logCronJob(jobName, success ? 'Completed successfully' : 'Failed', data);

  return NextResponse.json(response, {
    status: success ? 200 : 500,
  });
}

