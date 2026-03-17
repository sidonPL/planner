import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["BANK", "CASH", "SAVINGS", "INVESTMENT", "OTHER"]).optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET - pobierz szczegóły konta
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const account = await prisma.financialAccount.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        transactions: {
          take: 10,
          orderBy: { date: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Konto nie znalezione" },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("Error fetching financial account:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać konta" },
      { status: 500 }
    );
  }
}

// PATCH - aktualizuj konto
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updateAccountSchema.parse(body);

    // Sprawdź czy konto istnieje i należy do gospodarstwa
    const account = await prisma.financialAccount.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Konto nie znalezione" },
        { status: 404 }
      );
    }

    const updatedAccount = await prisma.financialAccount.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(updatedAccount);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating financial account:", error);
    return NextResponse.json(
      { error: "Nie udało się zaktualizować konta" },
      { status: 500 }
    );
  }
}

// DELETE - usuń konto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Sprawdź czy konto istnieje i należy do gospodarstwa
    const account = await prisma.financialAccount.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Konto nie znalezione" },
        { status: 404 }
      );
    }

    // Sprawdź czy konto ma powiązane transakcje
    if (account._count.transactions > 0) {
      return NextResponse.json(
        {
          error: "Nie można usunąć konta z powiązanymi transakcjami",
          transactionsCount: account._count.transactions,
        },
        { status: 400 }
      );
    }

    // Usuń konto
    await prisma.financialAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting financial account:", error);
    return NextResponse.json(
      { error: "Nie udało się usunąć konta" },
      { status: 500 }
    );
  }
}

