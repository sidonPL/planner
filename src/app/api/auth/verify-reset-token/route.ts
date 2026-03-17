import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - weryfikacja tokena resetu hasła
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token jest wymagany" },
        { status: 400 }
      );
    }

    // Znajdź token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Token nie istnieje" },
        { status: 404 }
      );
    }

    // Sprawdź czy token nie wygasł
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token wygasł" },
        { status: 410 }
      );
    }

    // Sprawdź czy token nie został już użyty
    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: "Token został już użyty" },
        { status: 410 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error verifying reset token:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}

