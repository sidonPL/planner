import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Przechowujemy preferencje kalendarza w taskFilterPreferences.calendar,
// aby uniknac zmian schematu bazy.
function normalizeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { taskFilterPreferences: true },
    });

    const rootPrefs = normalizeObject(settings?.taskFilterPreferences);
    const calendarPrefs = normalizeObject(rootPrefs.calendar);

    return NextResponse.json(calendarPrefs);
  } catch (error) {
    console.error("Blad podczas pobierania preferencji kalendarza:", error);
    return NextResponse.json(
      { error: "Nie udalo sie pobrac preferencji kalendarza" },
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
    const calendarPreferences = normalizeObject(body);

    const existing = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { taskFilterPreferences: true },
    });

    const rootPrefs = normalizeObject(existing?.taskFilterPreferences);
    const nextPreferences = {
      ...rootPrefs,
      calendar: calendarPreferences,
    } as Prisma.InputJsonValue;

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        taskFilterPreferences: nextPreferences,
      },
      create: {
        userId: session.user.id,
        taskFilterPreferences: nextPreferences,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blad podczas zapisywania preferencji kalendarza:", error);
    return NextResponse.json(
      { error: "Nie udalo sie zapisac preferencji kalendarza" },
      { status: 500 }
    );
  }
}


