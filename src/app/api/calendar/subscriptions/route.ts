import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const subscriptionSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  icalUrl: z.string().url("Nieprawidłowy URL"),
  syncInterval: z.number().min(15).max(10080).default(60), // 15 min - 7 dni
  eventFilter: z.string().optional(), // Słowa kluczowe oddzielone przecinkami
  colorMapping: z.string().optional(), // kolor1=kolor2, kolor3=kolor4
});

// GET - Lista subskrypcji użytkownika
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await prisma.calendarIntegration.findMany({
      where: {
        userId: session.user.id,
        type: { in: ["ICAL_URL", "ICAL_UPLOAD"] },
      },
      include: {
        _count: {
          select: { importedEvents: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(integrations);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Dodaj nową subskrypcję
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = subscriptionSchema.parse(body);

    // Sprawdź czy URL jest dostępny
    try {
      const response = await fetch(
        data.icalUrl.replace(/^webcal:\/\//i, "https://"),
        { method: "HEAD" }
      );
      if (!response.ok) {
        return NextResponse.json(
          { error: "Nie można pobrać kalendarza z podanego URL" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Nieprawidłowy lub niedostępny URL kalendarza" },
        { status: 400 }
      );
    }

    const integration = await prisma.calendarIntegration.create({
      data: {
        userId: session.user.id,
        type: "ICAL_URL",
        name: data.name,
        icalUrl: data.icalUrl,
        syncInterval: data.syncInterval,
        eventFilter: data.eventFilter || null,
        colorMapping: data.colorMapping || null,
        isActive: true,
      },
    });

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating integration:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

