import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";
import { Prisma } from "@prisma/client";

/**
 * GET /api/nutrition/goals
 *
 * Get user's nutrition goals
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get("active") === "true";

    const where: Prisma.NutritionGoalWhereInput = {
      userId: session.user.id,
    };

    if (onlyActive) {
      where.isActive = true;
    }

    const goals = await prisma.nutritionGoal.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get current active goal
    const activeGoal = goals.find(g => g.isActive);

    return NextResponse.json({
      goals,
      activeGoal,
      count: goals.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/nutrition/goals
 *
 * Create a new nutrition goal
 *
 * Body: {
 *   goalType: "daily" | "weekly";
 *   targetCalories?: number;
 *   targetProtein?: number;
 *   targetCarbs?: number;
 *   targetFat?: number;
 *   targetFiber?: number;
 *   notes?: string;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      goalType,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      targetFiber,
      notes,
    } = await req.json();

    if (!goalType || !["daily", "weekly"].includes(goalType)) {
      return NextResponse.json(
        { error: "Invalid goalType. Must be 'daily' or 'weekly'" },
        { status: 400 }
      );
    }

    // Deactivate previous active goals
    await prisma.nutritionGoal.updateMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    });

    // Create new goal
    const goal = await prisma.nutritionGoal.create({
      data: {
        userId: session.user.id,
        goalType,
        targetCalories: targetCalories || null,
        targetProtein: targetProtein || null,
        targetCarbs: targetCarbs || null,
        targetFat: targetFat || null,
        targetFiber: targetFiber || null,
        notes: notes?.trim() || null,
        isActive: true,
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

