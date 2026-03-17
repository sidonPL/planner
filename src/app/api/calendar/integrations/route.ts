import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - pobranie wszystkich integracji użytkownika
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await prisma.calendarIntegration.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(integrations);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - dodanie nowej integracji
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, name } = body;

    // Sprawdź czy integracja tego typu już istnieje
    const existing = await prisma.calendarIntegration.findUnique({
      where: {
        userId_type: {
          userId: session.user.id,
          type,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Integracja tego typu już istnieje" },
        { status: 400 }
      );
    }

    // Utwórz integrację
    const integration = await prisma.calendarIntegration.create({
      data: {
        userId: session.user.id,
        type,
        name: name || `Kalendarz ${type}`,
        lastSyncStatus: "PENDING",
      },
    });

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Error creating integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

