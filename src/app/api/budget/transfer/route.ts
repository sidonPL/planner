import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const transferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string(),
});

// POST - przenieś środki między kontami
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = transferSchema.parse(body);

    // Sprawdź czy konta istnieją i należą do gospodarstwa
    const [fromAccount, toAccount] = await Promise.all([
      prisma.financialAccount.findUnique({
        where: { id: validatedData.fromAccountId },
      }),
      prisma.financialAccount.findUnique({
        where: { id: validatedData.toAccountId },
      }),
    ]);

    if (!fromAccount || fromAccount.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Invalid source account" }, { status: 400 });
    }

    if (!toAccount || toAccount.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Invalid target account" }, { status: 400 });
    }

    if (validatedData.fromAccountId === validatedData.toAccountId) {
      return NextResponse.json({ error: "Cannot transfer to the same account" }, { status: 400 });
    }

    // Sprawdź czy konto źródłowe ma wystarczające środki
    if (fromAccount.balance < validatedData.amount) {
      return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
    }

    // Wykonaj transfer w transakcji DB
    const result = await prisma.$transaction(async (tx) => {
      // Utwórz transakcję wypłaty z konta źródłowego
      const withdrawalTransaction = await tx.transaction.create({
        data: {
          type: "EXPENSE",
          amount: validatedData.amount,
          category: "transfer",
          description: validatedData.description || `Transfer do: ${toAccount.name}`,
          date: new Date(validatedData.date),
          householdId: session.user.householdId!,
          userId: session.user.id,
          accountId: validatedData.fromAccountId,
        },
        include: {
          user: { select: { id: true, name: true, color: true } },
          account: { select: { id: true, name: true, type: true, icon: true, color: true } },
        },
      });

      // Utwórz transakcję wpłaty na konto docelowe
      const depositTransaction = await tx.transaction.create({
        data: {
          type: "INCOME",
          amount: validatedData.amount,
          category: "transfer",
          description: validatedData.description || `Transfer z: ${fromAccount.name}`,
          date: new Date(validatedData.date),
          householdId: session.user.householdId!,
          userId: session.user.id,
          accountId: validatedData.toAccountId,
        },
        include: {
          user: { select: { id: true, name: true, color: true } },
          account: { select: { id: true, name: true, type: true, icon: true, color: true } },
        },
      });

      // Zaktualizuj salda kont
      await tx.financialAccount.update({
        where: { id: validatedData.fromAccountId },
        data: { balance: { decrement: validatedData.amount } },
      });

      await tx.financialAccount.update({
        where: { id: validatedData.toAccountId },
        data: { balance: { increment: validatedData.amount } },
      });

      return {
        withdrawal: withdrawalTransaction,
        deposit: depositTransaction,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating transfer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

