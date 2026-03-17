import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * PATCH /api/nutrition/goals/[id]
 *
 * Update a nutrition goal
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const updates = await req.json();

    // Verify ownership
    const existingGoal = await prisma.nutritionGoal.findUnique({
      where: { id },
    });

    if (!existingGoal || existingGoal.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 }
      );
    }

    const goal = await prisma.nutritionGoal.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ goal });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/nutrition/goals/[id]
 *
 * Delete a nutrition goal
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existingGoal = await prisma.nutritionGoal.findUnique({
      where: { id },
    });

    if (!existingGoal || existingGoal.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 }
      );
    }

    await prisma.nutritionGoal.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Goal deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

