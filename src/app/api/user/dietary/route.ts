import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(settings?.dietaryPreferences || null);
  } catch (error) {
    console.error("Błąd podczas pobierania preferencji żywieniowych:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać preferencji" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { allergies, diets, dislikes } = body;

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        dietaryPreferences: {
          allergies: allergies || [],
          diets: diets || [],
          dislikes: dislikes || [],
        },
      },
      create: {
        userId: session.user.id,
        dietaryPreferences: {
          allergies: allergies || [],
          diets: diets || [],
          dislikes: dislikes || [],
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd podczas zapisywania preferencji żywieniowych:", error);
    return NextResponse.json(
      { error: "Nie udało się zapisać preferencji" },
      { status: 500 }
    );
  }
}
