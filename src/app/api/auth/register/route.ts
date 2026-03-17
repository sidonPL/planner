import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Imię musi mieć co najmniej 2 znaki"),
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  householdName: z.string().optional(),
  householdId: z.string().optional(),
  inviteCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedFields = registerSchema.safeParse(body);

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane", details: validatedFields.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, householdName, householdId, inviteCode } = validatedFields.data;

    // Sprawdź czy użytkownik już istnieje
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Użytkownik z tym adresem email już istnieje" },
        { status: 400 }
      );
    }

    // Hashuj hasło
    const hashedPassword = await bcrypt.hash(password, 12);

    let household;

    // Utwórz nowe gospodarstwo lub dołącz do istniejącego
    if (inviteCode) {
      // Dołącz do gospodarstwa po kodzie zaproszenia
      household = await prisma.household.findUnique({
        where: { inviteCode },
      });

      if (!household) {
        return NextResponse.json(
          { error: "Nieprawidłowy kod zaproszenia" },
          { status: 404 }
        );
      }
    } else if (householdId) {
      household = await prisma.household.findUnique({
        where: { id: householdId },
      });

      if (!household) {
        return NextResponse.json(
          { error: "Nie znaleziono gospodarstwa domowego" },
          { status: 404 }
        );
      }
    } else if (householdName) {
      household = await prisma.household.create({
        data: { name: householdName },
      });
    }

    // Utwórz użytkownika
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: household ? (inviteCode || householdId ? "USER" : "ADMIN") : "USER",
        householdId: household?.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        householdId: true,
      },
    });

    // Utwórz domyślne ustawienia użytkownika
    await prisma.userSettings.create({
      data: {
        userId: user.id,
      },
    });

    // Jeśli utworzono nowe gospodarstwo, utwórz domyślne kategorie
    if (household && !householdId) {
      const defaultCategories = [
        { name: "Dom", color: "#3B82F6", icon: "home" },
        { name: "Praca", color: "#10B981", icon: "briefcase" },
        { name: "Zakupy", color: "#F59E0B", icon: "shopping-cart" },
        { name: "Zdrowie", color: "#EF4444", icon: "heart" },
        { name: "Finanse", color: "#8B5CF6", icon: "wallet" },
        { name: "Rodzina", color: "#EC4899", icon: "users" },
        { name: "Hobby", color: "#06B6D4", icon: "star" },
        { name: "Inne", color: "#6B7280", icon: "folder" },
      ];

      await prisma.category.createMany({
        data: defaultCategories.map((cat) => ({
          ...cat,
          householdId: household.id,
        })),
      });
    }

    return NextResponse.json(
      { message: "Konto zostało utworzone", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    // Dodatkowe logowanie dla błędów Prisma
    if (error && typeof error === 'object' && 'code' in error) {
      console.error("Prisma error code:", error.code);
      console.error("Prisma error meta:", 'meta' in error ? error.meta : 'no meta');
    }
    return NextResponse.json(
      {
        error: "Wystąpił błąd podczas rejestracji",
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

