import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createWeeklyLeaderboardSnapshot,
  createMonthlyLeaderboardSnapshot,
} from "@/lib/cron/create-leaderboard-snapshots";

/**
 * Manual trigger for leaderboard snapshot creation (Admin only)
 * POST /api/admin/leaderboard/snapshot?period=weekly|monthly|both
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "weekly";

    // Pobierz wszystkie gospodarstwa domowe
    const households = await prisma.household.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    if (households.length === 0) {
      return NextResponse.json(
        { error: "No households found" },
        { status: 404 }
      );
    }

    const results = [];

    // Create snapshots dla każdego gospodarstwa
    for (const household of households) {
      try {
        if (period === "weekly") {
          await createWeeklyLeaderboardSnapshot(household.id);
          results.push({ household: household.name, period: "weekly", success: true });
        } else if (period === "monthly") {
          await createMonthlyLeaderboardSnapshot(household.id);
          results.push({ household: household.name, period: "monthly", success: true });
        } else if (period === "both") {
          await createWeeklyLeaderboardSnapshot(household.id);
          await createMonthlyLeaderboardSnapshot(household.id);
          results.push({ household: household.name, period: "both", success: true });
        } else {
          return NextResponse.json(
            { error: "Invalid period. Use: weekly, monthly, or both" },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error(`Failed to create snapshot for household ${household.name}:`, error);
        results.push({
          household: household.name,
          period,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Leaderboard snapshot (${period}) created for ${households.length} household(s)`,
      results,
    });
  } catch (error) {
    console.error("Error creating leaderboard snapshot:", error);
    return NextResponse.json(
      { error: "Failed to create leaderboard snapshot" },
      { status: 500 }
    );
  }
}

