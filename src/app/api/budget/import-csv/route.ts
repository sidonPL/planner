import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const csvTransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().optional(),
  accountId: z.string().optional(),
});

// POST - import transakcji z CSV
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { transactions, accountId } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: "No transactions provided" }, { status: 400 });
    }

    // Waliduj każdą transakcję
    const validatedTransactions = transactions.map((t) => {
      try {
        return csvTransactionSchema.parse(t);
      } catch (error) {
        console.error("Invalid transaction:", t, error);
        return null;
      }
    }).filter((t): t is z.infer<typeof csvTransactionSchema> => t !== null);

    if (validatedTransactions.length === 0) {
      return NextResponse.json({ error: "No valid transactions" }, { status: 400 });
    }

    // Sprawdź czy konto istnieje (jeśli podane)
    if (accountId) {
      const account = await prisma.financialAccount.findFirst({
        where: {
          id: accountId,
          householdId: session.user.householdId,
        },
      });

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
    }

    // Importuj transakcje
    const imported = [];
    const skipped = [];
    const errors = [];

    for (const transaction of validatedTransactions) {
      try {
        // Sprawdź duplikaty (ta sama data, kwota i opis)
        const existing = await prisma.transaction.findFirst({
          where: {
            householdId: session.user.householdId,
            date: new Date(transaction.date),
            amount: transaction.amount,
            description: transaction.description,
          },
        });

        if (existing) {
          skipped.push({
            transaction,
            reason: "duplicate",
          });
          continue;
        }

        // Znajdź lub stwórz kategorię
        let category = await prisma.category.findFirst({
          where: {
            householdId: session.user.householdId,
            name: transaction.category || "Inne",
          },
        });

        if (!category && transaction.category) {
          category = await prisma.category.create({
            data: {
              name: transaction.category,
              type: transaction.type,
              householdId: session.user.householdId,
            },
          });
        }

        // Stwórz transakcję
        const created = await prisma.transaction.create({
          data: {
            date: new Date(transaction.date),
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            categoryId: category?.id,
            accountId: transaction.accountId || accountId || undefined,
            userId: session.user.id,
            householdId: session.user.householdId,
          },
          include: {
            account: true,
          },
        });

        imported.push(created);
      } catch (error) {
        console.error("Error importing transaction:", error);
        errors.push({
          transaction,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length,
      data: {
        imported,
        skipped,
        errors,
      },
    });
  } catch (error) {
    console.error("Error importing CSV:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

