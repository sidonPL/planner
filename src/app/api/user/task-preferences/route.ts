// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\user\task-preferences\route.ts
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

    return NextResponse.json(settings?.taskFilterPreferences || null);
  } catch (error) {
    console.error("Błąd podczas pobierania preferencji:", error);
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

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        taskFilterPreferences: body,
      },
      create: {
        userId: session.user.id,
        taskFilterPreferences: body,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd podczas zapisywania preferencji:", error);
    return NextResponse.json(
      { error: "Nie udało się zapisać preferencji" },
      { status: 500 }
    );
  }
}
