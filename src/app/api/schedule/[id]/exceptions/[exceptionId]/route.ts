// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\api\schedule\[id]\exceptions\[exceptionId]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exceptionId: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, exceptionId } = await params;

  try {
    // Sprawdź czy wyjątek istnieje i harmonogram należy do gospodarstwa
    const exception = await prisma.scheduleException.findFirst({
      where: {
        id: exceptionId,
        scheduleId: id,
        schedule: {
          householdId: session.user.householdId,
        },
      },
    });

    if (!exception) {
      return NextResponse.json(
        { error: "Wyjątek nie znaleziony" },
        { status: 404 }
      );
    }

    await prisma.scheduleException.delete({
      where: { id: exceptionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd podczas usuwania wyjątku:", error);
    return NextResponse.json(
      { error: "Nie udało się usunąć wyjątku" },
      { status: 500 }
    );
  }
}

