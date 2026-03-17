import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - pobierz wszystkie nagrody
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.householdId) {
    return NextResponse.json({ error: "No household" }, { status: 400 });
  }

  try {
    const rewards = await prisma.reward.findMany({
      where: {
        householdId: session.user.householdId,
        isActive: true,
      },
      include: {
        claims: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { pointsCost: "asc" },
    });

    return NextResponse.json(rewards);
  } catch (error) {
    console.error("Błąd podczas pobierania nagród:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać nagród" },
      { status: 500 }
    );
  }
}

// POST - utwórz nową nagrodę
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.householdId) {
    return NextResponse.json({ error: "No household" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, description, icon, pointsCost } = body;

    if (!name || !pointsCost) {
      return NextResponse.json(
        { error: "Nazwa i koszt punktowy są wymagane" },
        { status: 400 }
      );
    }

    const reward = await prisma.reward.create({
      data: {
        name,
        description,
        icon: icon || "gift",
        pointsCost: parseInt(pointsCost),
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    console.error("Błąd podczas tworzenia nagrody:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć nagrody" },
      { status: 500 }
    );
  }
}

