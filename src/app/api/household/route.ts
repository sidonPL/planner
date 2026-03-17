import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const householdUpdateSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(100, "Nazwa jest za długa"),
});

// PATCH - aktualizuj gospodarstwo (nazwa)
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json(
        { error: "Nie należysz do gospodarstwa" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = householdUpdateSchema.parse(body);

    // Pobierz gospodarstwo i sprawdź uprawnienia
    const household = await prisma.household.findUnique({
      where: { id: session.user.householdId },
      select: { ownerId: true },
    });

    if (!household) {
      return NextResponse.json(
        { error: "Gospodarstwo nie znalezione" },
        { status: 404 }
      );
    }

    // Sprawdź czy użytkownik jest właścicielem gospodarstwa (lub global admin)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isHouseholdOwner = household.ownerId === session.user.id;
    const isGlobalAdmin = user?.role === "ADMIN";

    if (!isHouseholdOwner && !isGlobalAdmin) {
      return NextResponse.json(
        { error: "Tylko właściciel gospodarstwa może zmieniać jego nazwę" },
        { status: 403 }
      );
    }

    // Zaktualizuj nazwę gospodarstwa
    const updatedHousehold = await prisma.household.update({
      where: { id: session.user.householdId },
      data: { name: validatedData.name.trim() },
    });

    return NextResponse.json(updatedHousehold);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating household:", error);
    return NextResponse.json(
      { error: "Nie udało się zaktualizować gospodarstwa" },
      { status: 500 }
    );
  }
}

// Tworzenie nowego gospodarstwa domowego
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Nie jesteś zalogowany" },
        { status: 401 }
      );
    }

    // Sprawdź czy użytkownik już należy do gospodarstwa
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (existingUser?.householdId) {
      return NextResponse.json(
        { message: "Już należysz do gospodarstwa domowego" },
        { status: 400 }
      );
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { message: "Nazwa gospodarstwa jest wymagana" },
        { status: 400 }
      );
    }

    // Utwórz gospodarstwo i zaktualizuj użytkownika w jednej transakcji
    const result = await prisma.$transaction(async (tx) => {
      // Utwórz gospodarstwo z właścicielem
      const household = await tx.household.create({
        data: {
          name: name.trim(),
          ownerId: session.user.id,  // Ustaw twórcę jako właściciela/administratora
        },
      });

      // Przypisz użytkownika do gospodarstwa (jako zwykły USER, nie ADMIN całej aplikacji)
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: {
          householdId: household.id,
          // role pozostaje USER - nie dajemy auto-admin do całej aplikacji!
        },
      });

      // Utwórz domyślne ustawienia użytkownika
      await tx.userSettings.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          defaultViewMode: "family",
        },
        update: {},
      });

      return { household, user };
    });

    return NextResponse.json({
      message: "Gospodarstwo utworzone",
      householdId: result.household.id,
      householdName: result.household.name,
    });
  } catch (error) {
    console.error("Error creating household:", error);
    return NextResponse.json(
      { message: "Nie udało się utworzyć gospodarstwa" },
      { status: 500 }
    );
  }
}

// Pobieranie informacji o gospodarstwie
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Nie jesteś zalogowany" },
        { status: 401 }
      );
    }

    if (!session.user.householdId) {
      return NextResponse.json(
        { message: "Nie należysz do żadnego gospodarstwa" },
        { status: 404 }
      );
    }

    const household = await prisma.household.findUnique({
      where: { id: session.user.householdId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            color: true,
            role: true,
          },
        },
      },
    });

    if (!household) {
      return NextResponse.json(
        { message: "Gospodarstwo nie istnieje" },
        { status: 404 }
      );
    }

    return NextResponse.json(household);
  } catch (error) {
    console.error("Error fetching household:", error);
    return NextResponse.json(
      { message: "Nie udało się pobrać danych gospodarstwa" },
      { status: 500 }
    );
  }
}

