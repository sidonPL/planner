import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AnniversaryType } from "@prisma/client";

const anniversarySchema = z.object({
  title: z.string().min(1, "Tytuł jest wymagany"),
  description: z.string().optional(),
  date: z.string().transform(val => new Date(val)),
  type: z.nativeEnum(AnniversaryType),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// GET - pobierz rocznicę
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const anniversary = await prisma.anniversary.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!anniversary) {
      return NextResponse.json({ error: "Anniversary not found" }, { status: 404 });
    }

    return NextResponse.json(anniversary);
  } catch (error) {
    console.error("Error fetching anniversary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - zaktualizuj rocznicę
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = anniversarySchema.partial().parse(body);

    // Sprawdź czy rocznica należy do gospodarstwa użytkownika
    const existingAnniversary = await prisma.anniversary.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existingAnniversary) {
      return NextResponse.json({ error: "Anniversary not found" }, { status: 404 });
    }

    const anniversary = await prisma.anniversary.update({
      where: { id },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(anniversary);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating anniversary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń rocznicę
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy rocznica należy do gospodarstwa użytkownika
    const existingAnniversary = await prisma.anniversary.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existingAnniversary) {
      return NextResponse.json({ error: "Anniversary not found" }, { status: 404 });
    }

    await prisma.anniversary.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting anniversary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

