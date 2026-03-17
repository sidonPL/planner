import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * GET /api/recipes/collections
 *
 * Returns all recipe collections for the user's household
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collections = await prisma.recipeCollection.findMany({
      where: {
        OR: [
          { userId: session.user.id }, // User's own collections
          { householdId: session.user.householdId, isShared: true }, // Shared collections
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        recipes: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                image: true,
                category: true,
                difficulty: true,
                totalTime: true,
              },
            },
          },
          orderBy: {
            addedAt: "desc",
          },
        },
        _count: {
          select: {
            recipes: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ collections });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/recipes/collections
 *
 * Create a new recipe collection
 *
 * Body: {
 *   name: string;
 *   description?: string;
 *   icon?: string;
 *   color?: string;
 *   isShared?: boolean;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, icon, color, isShared } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    const collection = await prisma.recipeCollection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || "📁",
        color: color || "#3B82F6",
        isShared: isShared || false,
        userId: session.user.id!,
        householdId: session.user.householdId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            recipes: true,
          },
        },
      },
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

