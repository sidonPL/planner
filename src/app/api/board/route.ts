import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const noteSchema = z.object({
  content: z.string().optional().default(""),
  color: z.string().optional(),
  drawing: z.string().optional(),
});

// GET - pobierz notatki
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await prisma.boardNote.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - utwórz notatkę
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = noteSchema.parse(body);

    const note = await prisma.boardNote.create({
      data: {
        content: validatedData.content,
        color: validatedData.color,
        drawing: validatedData.drawing,
        householdId: session.user.householdId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Wyślij powiadomienia do innych członków gospodarstwa
    if (session.user.householdId) {
      const otherMembers = await prisma.user.findMany({
        where: {
          householdId: session.user.householdId,
          id: { not: session.user.id },
        },
        select: { id: true },
      });

      const contentPreview = validatedData.content.length > 50 
        ? validatedData.content.substring(0, 50) + "..." 
        : validatedData.content;

      await Promise.all(
        otherMembers.map((member) =>
          createNotification({
            userId: member.id,
            householdId: session.user.householdId!,
            title: `Nowa wiadomość od ${session.user.name || "członka rodziny"}`,
            message: contentPreview,
            type: "SYSTEM", // TODO: zmienić na BOARD_MESSAGE po regeneracji Prisma
            link: "/board",
          })
        )
      );
    }

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

