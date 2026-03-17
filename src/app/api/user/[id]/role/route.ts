import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageUser } from "@/lib/permissions";
import { UserRole } from "@prisma/client";

// PATCH - zmień rolę użytkownika
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sprawdź czy użytkownik ma uprawnienia admina
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Tylko administrator może zmieniać role użytkowników" },
        { status: 403 }
      );
    }

    // Sprawdź czy użytkownik docelowy należy do tego samego gospodarstwa
    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Użytkownik nie znaleziony" },
        { status: 404 }
      );
    }

    // Nie pozwól na zmianę własnej roli (ochrona przed utratą admina)
    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "Nie możesz zmienić własnej roli" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role } = body;

    // Walidacja roli
    if (!["ADMIN", "USER", "CHILD"].includes(role)) {
      return NextResponse.json(
        { error: "Nieprawidłowa rola" },
        { status: 400 }
      );
    }

    // Sprawdź czy możemy zarządzać tym użytkownikiem
    if (!canManageUser(currentUser.role, targetUser.role)) {
      return NextResponse.json(
        { error: "Brak uprawnień do zarządzania tym użytkownikiem" },
        { status: 403 }
      );
    }

    // Zaktualizuj rolę
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as UserRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        color: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas zmiany roli" },
      { status: 500 }
    );
  }
}

