import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - pobierz ustawienia użytkownika
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Jeśli nie ma ustawień, utwórz domyślne
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - aktualizuj ustawienia użytkownika (pełna aktualizacja)
export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Sprawdź czy użytkownik ma już ustawienia
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    let settings;

    if (existingSettings) {
      settings = await prisma.userSettings.update({
        where: { userId: session.user.id },
        data: body,
      });
    } else {
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          ...body,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - częściowa aktualizacja ustawień
export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Upsert - aktualizuj lub utwórz
    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: body,
      create: {
        userId: session.user.id,
        ...body,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error patching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

