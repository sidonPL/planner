"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Landmark, Eye, EyeOff, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import type { FinancialAccount, Transaction } from "@prisma/client";

type TransactionWithUser = Transaction & {
  user: { id: string; name: string | null; color: string };
};

type AccountWithTransactions = FinancialAccount & {
  transactions: TransactionWithUser[];
};

interface FinancialAccountsWidgetProps {
  accounts: AccountWithTransactions[];
}

const accountTypeIcons: Record<string, string> = {
  BANK: "🏦",
  CASH: "💵",
  SAVINGS: "🐷",
  INVESTMENT: "📈",
  OTHER: "💰",
};

const categoryEmojis: Record<string, string> = {
  food: "🍕",
  transport: "🚗",
  bills: "📄",
  entertainment: "🎬",
  shopping: "🛍️",
  health: "💊",
  home: "🏠",
  salary: "💰",
  bonus: "🎁",
  freelance: "💻",
  gift: "🎀",
  other: "📦",
};

export function FinancialAccountsWidget({ accounts }: FinancialAccountsWidgetProps) {
  const [showBalances, setShowBalances] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const activeAccounts = accounts.filter((acc) => acc.isActive);
  const totalBalance = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Najważniejsze konta (top 3 po saldzie)
  const topAccounts = [...activeAccounts]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3);

  // Wszystkie ostatnie transakcje z wszystkich kont (max 10)
  const allRecentTransactions = activeAccounts
    .flatMap((account) =>
      account.transactions.map((transaction) => ({
        ...transaction,
        account,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-blue-500" />
            Majątek
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowBalances(!showBalances)}
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Balance */}
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-4 text-white">
          <p className="text-sm font-medium text-blue-100 mb-1">Całkowity majątek</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {showBalances ? totalBalance.toFixed(2) : "••••••"}
            </span>
            <span className="text-blue-100">PLN</span>
          </div>
          <p className="text-sm text-blue-100 mt-2">
            {activeAccounts.length} {activeAccounts.length === 1 ? "konto" : "konta"}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Przegląd</TabsTrigger>
            <TabsTrigger value="transactions">Transakcje</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-2 mt-3">
            {topAccounts.length > 0 ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">Główne konta</p>
                {topAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {account.icon || accountTypeIcons[account.type]}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {account.name}
                        </span>
                        {account.transactions.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {account.transactions.length} ostatnich
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold">
                      {showBalances ? `${account.balance.toFixed(2)} ${account.currency}` : "••••"}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Brak aktywnych kont
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-2 mt-3">
            {allRecentTransactions.length > 0 ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">Ostatnie operacje</p>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {allRecentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-base">
                          {categoryEmojis[transaction.category || "other"]}
                        </span>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs truncate">
                              {transaction.description || transaction.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{transaction.account.icon || accountTypeIcons[transaction.account.type]}</span>
                            <span className="truncate">{transaction.account.name}</span>
                            <span>•</span>
                            <span>{format(new Date(transaction.date), "dd MMM", { locale: pl })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {transaction.type === "INCOME" ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span
                          className={`text-xs font-semibold whitespace-nowrap ${
                            transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {transaction.type === "INCOME" ? "+" : "-"}
                          {showBalances ? transaction.amount.toFixed(0) : "••"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Brak transakcji
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* View All Link */}
        <Link href="/financial-accounts">
          <Button variant="outline" className="w-full" size="sm">
            Zobacz wszystkie konta
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

