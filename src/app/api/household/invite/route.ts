import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

// GET - pobierz kod zaproszenia
export async function GET() {
  try {
    const session = await auth();

    console.log("GET /api/household/invite - Session:", {
      hasSession: !!session,
      userId: session?.user?.id,
      householdId: session?.user?.householdId,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nie jesteś zalogowany" },
        { status: 401 }
      );
    }

    if (!session.user.householdId) {
      return NextResponse.json(
        { error: "Nie należysz do żadnego gospodarstwa" },
        { status: 404 }
      );
    }

    const household = await prisma.household.findUnique({
      where: { id: session.user.householdId },
      select: { inviteCode: true },
    });

    if (!household) {
      console.error("Household not found:", session.user.householdId);
      return NextResponse.json(
        { error: "Gospodarstwo nie istnieje" },
        { status: 404 }
      );
    }

    // Jeśli nie ma kodu, wygeneruj go
    if (!household.inviteCode) {
      const inviteCode = nanoid(10);
      await prisma.household.update({
        where: { id: session.user.householdId },
        data: { inviteCode },
      });

      console.log("Generated new invite code:", inviteCode);
      return NextResponse.json({ inviteCode });
    }

    console.log("Returning existing invite code");
    return NextResponse.json({ inviteCode: household.inviteCode });
  } catch (error) {
    console.error("Error fetching invite code:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać kodu zaproszenia" },
      { status: 500 }
    );
  }
}

// POST - wygeneruj nowy kod zaproszenia
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json(
        { error: "Nie należysz do gospodarstwa" },
        { status: 401 }
      );
    }

    // Sprawdź czy użytkownik jest adminem
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Tylko administrator może generować kod zaproszenia" },
        { status: 403 }
      );
    }

    const inviteCode = nanoid(10);
    await prisma.household.update({
      where: { id: session.user.householdId },
      data: { inviteCode },
    });

    return NextResponse.json({ inviteCode });
  } catch (error) {
    console.error("Error generating invite code:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować kodu zaproszenia" },
      { status: 500 }
    );
  }
}

