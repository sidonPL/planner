import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMicrosoftAuthUrl } from "@/lib/microsoft-calendar";

// GET - Rozpocznij Microsoft OAuth flow
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Microsoft OAuth not configured" },
        { status: 500 }
      );
    }

    const authUrl = await getMicrosoftAuthUrl(session.user.id);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error starting Microsoft OAuth:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

