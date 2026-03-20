import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthorizationUrl } from "@/lib/google-calendar";

// GET - Rozpocznij OAuth flow
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sprawdź czy są ustawione zmienne środowiskowe
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 }
      );
    }

    // Wygeneruj URL autoryzacji
    const authUrl = getAuthorizationUrl(session.user.id);

    // Przekieruj użytkownika do Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error starting Google OAuth:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

