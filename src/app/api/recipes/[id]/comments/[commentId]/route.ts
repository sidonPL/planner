import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/recipes/[id]/comments/[commentId]
 * Delete a comment (only by owner or admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;

    // Find comment
    const comment = await prisma.recipeComment.findUnique({
      where: { id: commentId },
      select: { userId: true, recipeId: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check if user owns the comment
    if (comment.userId !== session.user.id) {
      // Check if user is admin of the household
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    await prisma.recipeComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

