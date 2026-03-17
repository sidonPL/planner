import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, listCalendars } from "@/lib/google-calendar";

// GET - Callback po autoryzacji Google
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    // Jeśli użytkownik odrzucił
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=access_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=invalid_request`
      );
    }

    const userId = state;

    // Wymień kod na tokeny
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=token_error`
      );
    }

    // Pobierz listę kalendarzy
    const calendars = await listCalendars(tokens.access_token);
    const primaryCalendar = calendars.find((cal) => cal.primary) || calendars[0];

    if (!primaryCalendar?.id) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=no_calendar`
      );
    }

    // Oblicz expiry
    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1h default

    // Zapisz integrację
    await prisma.calendarIntegration.create({
      data: {
        userId,
        type: "GOOGLE",
        name: primaryCalendar.summary || "Google Calendar",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry,
        calendarId: primaryCalendar.id,
        syncInterval: 60, // Co godzinę
        isActive: true,
        lastSyncStatus: "PENDING",
      },
    });

    // Przekieruj z sukcesem
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?success=google_connected`
    );
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=server_error`
    );
  }
}

