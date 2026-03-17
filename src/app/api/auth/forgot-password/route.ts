import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// POST - wysłanie żądania resetu hasła
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email jest wymagany" },
        { status: 400 }
      );
    }

    // Znajdź użytkownika
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Zawsze zwracaj sukces, nawet jeśli użytkownik nie istnieje
    // (zapobiega enumeracji użytkowników)
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Usuń stare tokeny dla tego użytkownika
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Wygeneruj nowy token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 godzina

    // Zapisz token
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Tutaj w przyszłości można dodać wysyłanie emaila
    // Na razie logujemy link do konsoli (dla developmentu)
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    console.log("===========================================");
    console.log("Reset password link for:", email);
    console.log("Link:", resetUrl);
    console.log("===========================================");

    // W produkcji wysłalibyśmy email:
    // await sendResetPasswordEmail(user.email, resetUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd. Spróbuj ponownie." },
      { status: 500 }
    );
  }
}

