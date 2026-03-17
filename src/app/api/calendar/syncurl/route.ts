import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generuj unikalny token dla użytkownika (jeśli nie ma)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        calendarSyncToken: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let syncToken = user.calendarSyncToken;

    if (!syncToken) {
      // Generuj nowy token
      syncToken = `sync_${session.user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await prisma.user.update({
        where: { id: session.user.id },
        data: { calendarSyncToken: syncToken },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const syncUrl = `${baseUrl}/api/calendar/sync/${syncToken}`;

    return NextResponse.json({
      syncUrl,
      webcalUrl: syncUrl.replace("https://", "webcal://").replace("http://", "webcal://"),
      instructions: {
        google: "Dodaj kalendarz przez URL w Google Calendar",
        apple: "Subskrybuj kalendarz w Calendar.app używając webcal:// URL",
        outlook: "Dodaj kalendarz z internetu w Outlook",
        other: "Użyj URL do subskrypcji w dowolnej aplikacji kalendarza",
      },
      refreshInterval: "1 godzina",
    });
  } catch (error) {
    console.error("Error generating sync URL:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

