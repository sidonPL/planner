import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateQuestProgress } from "@/lib/daily-quests";
import { sendShoppingAssignmentNotification } from "@/lib/shopping-notifications";
import { isUserInHousehold } from "@/lib/household-validation";
import { z } from "zod";

const updateShoppingItemSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  isPurchased: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  price: z.number().optional().nullable(),
  store: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

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
    const validatedData = updateShoppingItemSchema.parse(body);

    if (
      validatedData.assignedToId &&
      !(await isUserInHousehold(validatedData.assignedToId, session.user.householdId))
    ) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }

    const existingItem = await prisma.shoppingItem.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updatedCount = await prisma.shoppingItem.updateMany({
      where: {
        id,
        householdId: session.user.householdId,
      },
      data: validatedData,
    });

    if (updatedCount.count === 0) {
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

    if (
      validatedData.assignedToId &&
      validatedData.assignedToId !== existingItem.assignedToId &&
      updatedItem
    ) {
      await sendShoppingAssignmentNotification(
        validatedData.assignedToId,
        updatedItem.name,
        session.user.id,
        session.user.householdId
      );
    }

    if (
      validatedData.isPurchased === true &&
      !existingItem.isPurchased &&
      updatedItem
    ) {
      await updateQuestProgress(session.user.id, "SHOPPING", 1);
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
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
