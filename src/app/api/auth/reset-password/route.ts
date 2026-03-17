import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST - ustawienie nowego hasła
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token i hasło są wymagane" },
        { status: 400 }
      );
    }

    // Walidacja hasła
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Hasło musi mieć minimum 8 znaków" },
        { status: 400 }
      );
    }

    // Znajdź token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 400 }
      );
    }

    // Sprawdź czy token nie wygasł
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token wygasł. Poproś o nowy link." },
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

    // Hashuj nowe hasło
    const hashedPassword = await bcrypt.hash(password, 10);

    // Aktualizuj hasło użytkownika i oznacz token jako użyty
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd. Spróbuj ponownie." },
      { status: 500 }
    );
  }
}

