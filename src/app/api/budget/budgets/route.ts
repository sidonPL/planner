import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const budgetSchema = z.object({
  name: z.string().optional(),
  category: z.string().nullable(),
  amount: z.number().positive(),
  month: z.number().min(1).max(12).optional(),
  year: z.number().optional(),
  alertAt: z.number().optional(),
});

// GET - pobierz budżety
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const budgets = await prisma.budget.findMany({
      where: {
        householdId: session.user.householdId,
      },
      orderBy: { category: "asc" },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - utwórz nowy budżet
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = budgetSchema.parse(body);

    const now = new Date();
    const month = data.month ?? now.getMonth() + 1;
    const year = data.year ?? now.getFullYear();

    const budget = await prisma.budget.upsert({
      where: {
        householdId_category_month_year: {
          category: data.category ?? "",
          householdId: session.user.householdId,
          month,
          year,
        },
      },
      update: {
        amount: data.amount,
        alertAt: data.alertAt,
      },
      create: {
        name: data.name || `Budżet ${data.category || "Ogólny"}`,
        category: data.category,
        amount: data.amount,
        month,
        year,
        alertAt: data.alertAt,
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error creating budget:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń budżet
export async function DELETE(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Budget ID required" }, { status: 400 });
    }

    await prisma.budget.delete({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

