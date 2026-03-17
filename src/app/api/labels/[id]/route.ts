import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE - Usuń etykietę
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy etykieta należy do gospodarstwa
    const label = await prisma.taskLabel.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    await prisma.taskLabel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting label:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Aktualizuj etykietę
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, color } = body;

    // Sprawdź czy etykieta należy do gospodarstwa
    const label = await prisma.taskLabel.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const updateData: { name?: string; color?: string } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (color !== undefined) {
      if (!color.match(/^#[0-9A-F]{6}$/i)) {
        return NextResponse.json({ error: "Invalid color format" }, { status: 400 });
      }
      updateData.color = color;
    }

    const updatedLabel = await prisma.taskLabel.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedLabel);
  } catch (error) {
    console.error("Error updating label:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

