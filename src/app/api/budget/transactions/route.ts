import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyBudgetAlert } from "@/lib/notifications";
import { z } from "zod";

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive(),
  category: z.string(),
  description: z.string().optional(),
  date: z.string(),
  accountId: z.string().optional().nullable(),
});

// GET - pobierz transakcje
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const transactions = await prisma.transaction.findMany({
      where: {
        householdId: session.user.householdId,
        ...(startDate && endDate
          ? {
              date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
            color: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj transakcję
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = transactionSchema.parse(body);

    // Jeśli podano accountId, sprawdź czy konto istnieje i należy do gospodarstwa
    if (validatedData.accountId) {
      const account = await prisma.financialAccount.findUnique({
        where: { id: validatedData.accountId },
      });

      if (!account || account.householdId !== session.user.householdId) {
        return NextResponse.json({ error: "Invalid account" }, { status: 400 });
      }
    }

    // Utwórz transakcję i zaktualizuj saldo konta w jednej transakcji DB
    const transaction = await prisma.$transaction(async (tx) => {
      // Utwórz transakcję
      const newTransaction = await tx.transaction.create({
        data: {
          type: validatedData.type,
          amount: validatedData.amount,
          category: validatedData.category,
          description: validatedData.description,
          date: new Date(validatedData.date),
          householdId: session.user.householdId!,
          userId: session.user.id,
          accountId: validatedData.accountId || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          account: {
            select: {
              id: true,
              name: true,
              type: true,
              icon: true,
              color: true,
            },
          },
        },
      });

      // Zaktualizuj saldo konta jeśli wybrano konto
      if (validatedData.accountId) {
        const balanceChange = validatedData.type === "INCOME"
          ? validatedData.amount
          : -validatedData.amount;

        await tx.financialAccount.update({
          where: { id: validatedData.accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }

      return newTransaction;
    });

    // Sprawdź budżet jeśli to wydatek
    if (validatedData.type === "EXPENSE" && validatedData.category) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Pobierz budżet dla tej kategorii
      const budget = await prisma.budget.findUnique({
        where: {
          householdId_category_month_year: {
            householdId: session.user.householdId!,
            category: validatedData.category,
            month: currentMonth,
            year: currentYear,
          },
        },
      });

      if (budget) {
        // Oblicz całkowite wydatki w tej kategorii w tym miesiącu
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const totalExpenses = await prisma.transaction.aggregate({
          where: {
            householdId: session.user.householdId!,
            category: validatedData.category,
            type: "EXPENSE",
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const spent = totalExpenses._sum.amount || 0;
        const percentage = Math.round((spent / budget.amount) * 100);

        // Wyślij alert jeśli przekroczono próg (80% lub 100%)
        if (percentage >= 80) {
          // Pobierz administratorów gospodarstwa
          const admins = await prisma.user.findMany({
            where: {
              householdId: session.user.householdId,
              role: "ADMIN",
            },
            select: { id: true },
          });

          for (const admin of admins) {
            await notifyBudgetAlert(
              admin.id,
              session.user.householdId!,
              validatedData.category,
              percentage
            );
          }
        }
      }
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

