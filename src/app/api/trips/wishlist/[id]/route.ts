import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const wishlistUpdateSchema = z.object({
  destination: z.string().min(1).optional(),
  description: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  season: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  interestedUserIds: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  estimatedBudget: z.number().optional(),
});

// PATCH - aktualizuj miejsce na liście marzeń
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = wishlistUpdateSchema.parse(body);

    // Sprawdź czy miejsce należy do gospodarstwa domowego użytkownika
    const existingItem = await prisma.tripWishlist.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updatedItem = await prisma.tripWishlist.update({
      where: { id },
      data: validatedData,
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error updating wishlist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń miejsce z listy marzeń
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy miejsce należy do gospodarstwa domowego użytkownika
    const existingItem = await prisma.tripWishlist.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.tripWishlist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

