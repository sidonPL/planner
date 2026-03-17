import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE - usuń transakcję
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Najpierw pobierz transakcję, aby sprawdzić czy ma przypisane konto
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Usuń transakcję i przywróć saldo konta w jednej transakcji DB
    await prisma.$transaction(async (tx) => {
      // Usuń transakcję
      await tx.transaction.delete({
        where: { id },
      });

      // Przywróć saldo konta jeśli transakcja była przypisana do konta
      if (existingTransaction.accountId) {
        const balanceChange = existingTransaction.type === "INCOME"
          ? -existingTransaction.amount
          : existingTransaction.amount;

        await tx.financialAccount.update({
          where: { id: existingTransaction.accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

