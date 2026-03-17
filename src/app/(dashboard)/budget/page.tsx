import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BudgetClient } from "./BudgetClient";

export default async function BudgetPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const [transactions, budgets, members, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        householdId: session.user.householdId,
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
    }),
    prisma.budget.findMany({
      where: {
        householdId: session.user.householdId,
      },
    }),
    prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    }),
    prisma.financialAccount.findMany({
      where: {
        householdId: session.user.householdId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        currency: true,
        icon: true,
        color: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <BudgetClient
      transactions={transactions}
      budgets={budgets}
      members={members}
      accounts={accounts}
      currentUserId={session.user.id}
    />
  );
}

