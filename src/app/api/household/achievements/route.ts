import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  checkHouseholdAchievements,
  getHouseholdAchievements,
  getHouseholdAchievementStats,
  HOUSEHOLD_ACHIEVEMENTS,
} from "@/lib/householdAchievements";

// GET - pobierz osiągnięcia gospodarstwa
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [achievements, stats] = await Promise.all([
      getHouseholdAchievements(session.user.householdId),
      getHouseholdAchievementStats(session.user.householdId),
    ]);

    return NextResponse.json({
      achievements,
      stats,
      availableAchievements: Object.values(HOUSEHOLD_ACHIEVEMENTS),
    });
  } catch (error) {
    console.error("Error fetching household achievements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - sprawdź i przyznaj nowe osiągnięcia
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newAchievements = await checkHouseholdAchievements(
      session.user.householdId
    );

    return NextResponse.json({
      newAchievements,
      count: newAchievements.length,
    });
  } catch (error) {
    console.error("Error checking household achievements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

