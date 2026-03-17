import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  type: z.enum(["BANK", "CASH", "SAVINGS", "INVESTMENT", "OTHER"]),
  balance: z.number().default(0),
  currency: z.string().default("PLN"),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET - pobierz wszystkie konta finansowe
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.financialAccount.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching financial accounts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - utwórz nowe konto finansowe
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = accountSchema.parse(body);

    const account = await prisma.financialAccount.create({
      data: {
        ...validatedData,
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating financial account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

