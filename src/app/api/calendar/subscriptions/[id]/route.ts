import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchICS, parseICS } from "@/lib/ical";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  icalUrl: z.string().url().optional(),
  syncInterval: z.number().min(15).max(10080).optional(),
  isActive: z.boolean().optional(),
});

// GET - Szczegóły subskrypcji
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      include: {
        importedEvents: {
          orderBy: { startDate: "asc" },
          take: 50,
        },
        _count: {
          select: { importedEvents: true },
        },
      },
    });

    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Error fetching integration:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Aktualizuj subskrypcję
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const integration = await prisma.calendarIntegration.updateMany({
      where: {
        id: id,
        userId: session.user.id,
      },
      data,
    });

    if (integration.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating integration:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Usuń subskrypcję
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const integration = await prisma.calendarIntegration.deleteMany({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (integration.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

