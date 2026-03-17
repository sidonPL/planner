import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateRewardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  icon: z.string().optional(),
  pointsCost: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const reward = await prisma.reward.findUnique({
      where: { id },
      include: {
        claims: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    // Sprawdź czy nagroda należy do gospodarstwa domowego użytkownika
    if (reward.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(reward);
  } catch (error) {
    console.error("Error fetching reward:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sprawdź czy użytkownik jest adminem
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can edit rewards" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Walidacja danych
    const validationResult = updateRewardSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    // Sprawdź czy nagroda istnieje i należy do gospodarstwa
    const existingReward = await prisma.reward.findUnique({
      where: { id },
    });

    if (!existingReward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    if (existingReward.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reward = await prisma.reward.update({
      where: { id },
      data: validationResult.data,
    });

    return NextResponse.json(reward);
  } catch (error) {
    console.error("Error updating reward:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sprawdź czy użytkownik jest adminem
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete rewards" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Sprawdź czy nagroda istnieje i należy do gospodarstwa
    const existingReward = await prisma.reward.findUnique({
      where: { id },
    });

    if (!existingReward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    if (existingReward.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.reward.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reward:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

