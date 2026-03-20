import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeMicrosoftCode, listMicrosoftCalendars } from "@/lib/microsoft-calendar";

type MicrosoftCalendarSummary = {
  id: string;
  name?: string;
  isDefaultCalendar?: boolean;
};

// GET - Callback po autoryzacji Microsoft
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

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
    const tokens = await exchangeMicrosoftCode(code);

    if (!tokens.accessToken || !tokens.refreshToken) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=token_error`
      );
    }

    // Pobierz listę kalendarzy
    const calendars = (await listMicrosoftCalendars(
      tokens.accessToken
    )) as MicrosoftCalendarSummary[];
    const primaryCalendar = calendars.find((cal) => cal.isDefaultCalendar) || calendars[0];

    if (!primaryCalendar?.id) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=no_calendar`
      );
    }

    // Zapisz integrację
    await prisma.calendarIntegration.create({
      data: {
        userId,
        type: "OUTLOOK",
        name: primaryCalendar.name || "Outlook Calendar",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.expiresOn || new Date(Date.now() + 3600 * 1000),
        calendarId: primaryCalendar.id,
        syncInterval: 60,
        isActive: true,
        lastSyncStatus: "PENDING",
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?success=microsoft_connected`
    );
  } catch (error) {
    console.error("Error in Microsoft OAuth callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=server_error`
    );
  }
}

