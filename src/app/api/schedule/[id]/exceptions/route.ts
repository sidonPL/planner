// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\schedule\[id]\exceptions\route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        scheduleId: id,
        schedule: {
          householdId: session.user.householdId,
        },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(exceptions);
  } catch (error) {
    console.error("Błąd podczas pobierania wyjątków:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać wyjątków" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { date, reason } = body;

    if (!date) {
      return NextResponse.json(
        { error: "Data jest wymagana" },
        { status: 400 }
      );
    }

    // Sprawdź czy harmonogram istnieje i należy do gospodarstwa
    const schedule = await prisma.schedule.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Harmonogram nie znaleziony" },
        { status: 404 }
      );
    }

    // Sprawdź czy wyjątek na tę datę już istnieje
    const existingException = await prisma.scheduleException.findFirst({
      where: {
        scheduleId: id,
        date: new Date(date),
      },
    });

    if (existingException) {
      return NextResponse.json(
        { error: "Wyjątek na tę datę już istnieje" },
        { status: 400 }
      );
    }

    const exception = await prisma.scheduleException.create({
      data: {
        scheduleId: id,
        date: new Date(date),
        reason: reason || null,
      },
    });

    return NextResponse.json(exception);
  } catch (error) {
    console.error("Błąd podczas tworzenia wyjątku:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć wyjątku" },
      { status: 500 }
    );
  }
}

