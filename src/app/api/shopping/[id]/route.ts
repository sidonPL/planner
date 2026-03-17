import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateQuestProgress } from "@/lib/daily-quests";
import { sendShoppingAssignmentNotification } from "@/lib/shopping-notifications";

// PATCH - aktualizuj produkt
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const item = await prisma.shoppingItem.updateMany({
      where: {
        id,
        householdId: session.user.householdId,
      },
      data: body,
    });

    if (item.count === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updatedItem = await prisma.shoppingItem.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    // Send notification if item was assigned to someone
    if (body.assignedToId && updatedItem) {
      await sendShoppingAssignmentNotification(
        body.assignedToId,
        updatedItem.name,
        session.user.id,
        session.user.householdId
      );
    }

    // Update daily quest if item was marked as purchased
    if (body.purchased === true && updatedItem) {
      await updateQuestProgress(session.user.id, 'SHOPPING', 1);
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating shopping item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń produkt
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await prisma.shoppingItem.deleteMany({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (item.count === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shopping item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

