import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getValidatedUserId(): Promise<{ userId: string } | { response: NextResponse }> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!existingUser) {
    return {
      response: NextResponse.json(
        { error: "Sesja jest nieaktualna. Zaloguj się ponownie." },
        { status: 401 }
      ),
    };
  }

  return { userId: existingUser.id };
}

// GET - pobierz ustawienia użytkownika
export async function GET() {
  try {
    const validated = await getValidatedUserId();
    if ("response" in validated) {
      return validated.response;
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: validated.userId },
      update: {},
      create: {
        userId: validated.userId,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - aktualizuj ustawienia użytkownika (pełna aktualizacja)
export async function PUT(req: Request) {
  try {
    const validated = await getValidatedUserId();
    if ("response" in validated) {
      return validated.response;
    }

    const body = await req.json();

    // Sprawdź czy użytkownik ma już ustawienia
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: validated.userId },
    });

    let settings;

    if (existingSettings) {
      settings = await prisma.userSettings.update({
        where: { userId: validated.userId },
        data: body,
      });
    } else {
      settings = await prisma.userSettings.create({
        data: {
          userId: validated.userId,
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
    const validated = await getValidatedUserId();
    if ("response" in validated) {
      return validated.response;
    }

    const body = await req.json();

    // Upsert - aktualizuj lub utwórz
    const settings = await prisma.userSettings.upsert({
      where: { userId: validated.userId },
      update: body,
      create: {
        userId: validated.userId,
        ...body,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error patching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

