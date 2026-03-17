import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.householdId) {
    return NextResponse.json({ error: "No household" }, { status: 400 });
  }

  try {
    const { noteIds } = await request.json();

    if (!Array.isArray(noteIds)) {
      return NextResponse.json({ error: "Invalid noteIds" }, { status: 400 });
    }

    // Aktualizuj kolejność każdej notatki
    await Promise.all(
      noteIds.map((id: string, index: number) =>
        prisma.boardNote.update({
          where: {
            id,
            householdId: session.user.householdId!,
          },
          data: {
            position: index,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd podczas zapisywania kolejności notatek:", error);
    return NextResponse.json(
      { error: "Nie udało się zapisać kolejności" },
      { status: 500 }
    );
  }
}

