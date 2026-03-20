import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH - edytuj globalny składnik
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
    const { name, category, commonUnit } = body;

    // Sprawdź czy składnik należy do gospodarstwa
    const existing = await prisma.globalIngredient.findUnique({
      where: { id },
    });

    if (!existing || existing.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.globalIngredient.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        category: category !== undefined ? category?.trim() || null : existing.category,
        commonUnit: commonUnit !== undefined ? commonUnit?.trim() || null : existing.commonUnit,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating global ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - usuń globalny składnik
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

    // Sprawdź czy składnik należy do gospodarstwa
    const existing = await prisma.globalIngredient.findUnique({
      where: { id },
    });

    if (!existing || existing.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.globalIngredient.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting global ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

