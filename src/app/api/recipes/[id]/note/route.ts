import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const noteSchema = z.object({
  content: z.string().min(1),
});

/**
 * GET /api/recipes/[id]/note
 * Get user's note for this recipe
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId } = await params;

    const note = await prisma.recipeNote.findUnique({
      where: {
        userId_recipeId: {
          userId: session.user.id,
          recipeId,
        },
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recipes/[id]/note
 * Create or update note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId } = await params;
    const body = await request.json();

    const validation = noteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { content } = validation.data;

    // Verify recipe exists and user has access
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { householdId: true },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId || user.householdId !== recipe.householdId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Upsert note
    const savedNote = await prisma.recipeNote.upsert({
      where: {
        userId_recipeId: {
          userId: session.user.id,
          recipeId,
        },
      },
      create: {
        userId: session.user.id,
        recipeId,
        content,
      },
      update: {
        content,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ note: savedNote });
  } catch (error) {
    console.error("Error saving note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipes/[id]/note
 * Delete user's note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId } = await params;

    await prisma.recipeNote.delete({
      where: {
        userId_recipeId: {
          userId: session.user.id,
          recipeId,
        },
      },
    });

    return NextResponse.json({ message: "Note deleted" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

