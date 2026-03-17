import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, addDays } from "date-fns";

// GET - pobierz aktualne wyzwania
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Poniedziałek
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Pobierz wyzwania dla obecnego tygodnia
    const challenges = await prisma.weeklyChallenge.findMany({
      where: {
        householdId: session.user.householdId,
        weekStart: {
          lte: weekEnd,
        },
        weekEnd: {
          gte: weekStart,
        },
        isActive: true,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(challenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Auto-generuj wyzwania tygodniowe
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { weekOffset = 0 } = body; // 0 = ten tydzień, 1 = następny

    const now = new Date();
    const targetDate = addDays(now, weekOffset * 7);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    // Sprawdź czy już istnieją wyzwania dla tego tygodnia
    const existing = await prisma.weeklyChallenge.findFirst({
      where: {
        householdId: session.user.householdId,
        weekStart,
        weekEnd,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Challenges already exist for this week" }, { status: 400 });
    }

    // Szablon wyzwań
    const challengeTemplates = [
      {
        title: "Mistrz Zadań",
        description: "Wykonaj 10 zadań w tym tygodniu",
        type: "TASKS",
        target: 10,
        reward: 100,
        icon: "✅",
      },
      {
        title: "Streak Master",
        description: "Utrzymaj 7-dniową serię rutyn",
        type: "ROUTINES",
        target: 7,
        reward: 150,
        icon: "🔥",
      },
      {
        title: "Kucharz Tygodnia",
        description: "Użyj 5 różnych przepisów",
        type: "RECIPES",
        target: 5,
        reward: 120,
        icon: "👨‍🍳",
      },
      {
        title: "Zakupowy Heros",
        description: "Zrób zakupy 3 razy według listy",
        type: "SHOPPING",
        target: 3,
        reward: 80,
        icon: "🛒",
      },
      {
        title: "Planista Posiłków",
        description: "Zaplanuj 14 posiłków",
        type: "MEALS",
        target: 14,
        reward: 100,
        icon: "🍽️",
      },
    ];

    // Wybierz losowo 3 wyzwania
    const selectedChallenges = challengeTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // Stwórz wyzwania
    const created = await Promise.all(
      selectedChallenges.map((template) =>
        prisma.weeklyChallenge.create({
          data: {
            householdId: session.user.householdId!,
            title: template.title,
            description: template.description,
            type: template.type as any,
            target: template.target,
            reward: template.reward,
            icon: template.icon,
            weekStart,
            weekEnd,
          },
        })
      )
    );

    // Auto-join wszystkich członków gospodarstwa
    const members = await prisma.user.findMany({
      where: { householdId: session.user.householdId },
      select: { id: true },
    });

    for (const challenge of created) {
      await prisma.challengParticipant.createMany({
        data: members.map((member) => ({
          challengeId: challenge.id,
          userId: member.id,
        })),
      });
    }

    return NextResponse.json({
      created: created.length,
      challenges: created
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating challenges:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

