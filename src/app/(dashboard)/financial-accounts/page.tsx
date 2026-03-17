import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FinancialAccountsClient } from "./FinancialAccountsClient";

export default async function FinancialAccountsPage() {
  const session = await auth();

  if (!session?.user?.householdId) {
    redirect("/auth/signin");
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

  const transactions = await prisma.transaction.findMany({
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
      account: true,
    },
    orderBy: {
      date: "desc",
    },
    take: 50,
  });

  return (
    <FinancialAccountsClient
      initialAccounts={accounts}
      recentTransactions={transactions}
    />
  );
}

