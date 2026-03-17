import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const joinSchema = z.object({
  inviteCode: z.string().min(1, "Kod zaproszenia jest wymagany"),
});

// POST - dołącz do gospodarstwa używając kodu zaproszenia
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nie jesteś zalogowany" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { inviteCode } = joinSchema.parse(body);

    // Sprawdź czy użytkownik już należy do gospodarstwa
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (existingUser?.householdId) {
      return NextResponse.json(
        { error: "Już należysz do gospodarstwa domowego" },
        { status: 400 }
      );
    }

    // Znajdź gospodarstwo po kodzie zaproszenia
    const household = await prisma.household.findUnique({
      where: { inviteCode },
      select: { id: true, name: true },
    });

    if (!household) {
      return NextResponse.json(
        { error: "Nieprawidłowy kod zaproszenia" },
        { status: 404 }
      );
    }

    // Przypisz użytkownika do gospodarstwa
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        householdId: household.id,
        role: "USER",
      },
    });

    // Utwórz domyślne ustawienia użytkownika
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        defaultViewMode: "family",
      },
      update: {},
    });

    return NextResponse.json({
      message: "Dołączono do gospodarstwa",
      householdId: household.id,
      householdName: household.name,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error joining household:", error);
    return NextResponse.json(
      { error: "Nie udało się dołączyć do gospodarstwa" },
      { status: 500 }
    );
  }
}

