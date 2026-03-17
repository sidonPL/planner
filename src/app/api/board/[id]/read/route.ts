import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Sprawdź czy notatka istnieje i należy do gospodarstwa użytkownika
    const note = await prisma.boardNote.findFirst({
      where: {
        id,
        householdId: session.user.householdId!,
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Użyj raw SQL do utworzenia wpisu BoardNoteRead (obejście dla regeneracji Prisma)
    await prisma.$executeRaw`
      INSERT INTO "BoardNoteRead" (id, "noteId", "userId", "readAt")
      VALUES (gen_random_uuid()::text, ${id}, ${session.user.id}, NOW())
      ON CONFLICT ("noteId", "userId") DO UPDATE SET "readAt" = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd podczas oznaczania notatki jako przeczytanej:", error);
    return NextResponse.json(
      { error: "Nie udało się oznaczyć jako przeczytane" },
      { status: 500 }
    );
  }
}

