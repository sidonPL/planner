"use client";

import { TrendingUp, TrendingDown, Wallet, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string | null;
  userId: string;
}

interface BudgetWidgetProps {
  transactions: Transaction[];
  monthlyBudget?: number;
  viewMode: "family" | "personal";
  activeUserId?: string;
  userName?: string;
}

const categoryColors: Record<string, string> = {
  jedzenie: "#22c55e",
  transport: "#3b82f6",
  rachunki: "#f59e0b",
  rozrywka: "#a855f7",
  zakupy: "#ec4899",
  zdrowie: "#14b8a6",
  inne: "#6b7280",
};

export function BudgetWidget({
  transactions,
  monthlyBudget = 0,
  viewMode,
  activeUserId,
  userName,
}: BudgetWidgetProps) {
  // Filtruj transakcje per użytkownik
  const filteredTransactions =
    viewMode === "personal" && activeUserId
      ? transactions.filter((t) => t.userId === activeUserId)
      : transactions;

  // Oblicz sumy
  const operationalTransactions = filteredTransactions.filter(
    (t) => t.category !== "transfer"
  );

  const income = operationalTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = operationalTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;

  const expensesByCategory = operationalTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => {
      const cat = t.category?.toLowerCase() || "inne";
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  // Sortuj kategorie malejąco
  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  // Procent budżetu wykorzystany
  const budgetUsedPercent = monthlyBudget > 0 ? (expenses / monthlyBudget) * 100 : 0;
  const isOverBudget = budgetUsedPercent > 100;
  const isNearLimit = budgetUsedPercent > 80 && !isOverBudget;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          {viewMode === "personal" && userName
            ? `Budżet: ${userName}`
            : "Budżet miesiąca"}
        </CardTitle>
        {monthlyBudget > 0 && (
          <CardDescription>
            Limit: {monthlyBudget.toLocaleString("pl-PL")} zł
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bilans */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Bilans</span>
          <span
            className={cn(
              "text-2xl font-bold",
              balance >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {balance >= 0 ? "+" : ""}
            {balance.toLocaleString("pl-PL")} zł
          </span>
        </div>

        {/* Przychody i wydatki */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Przychody</p>
              <p className="font-medium text-green-600">
                +{income.toLocaleString("pl-PL")} zł
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Wydatki</p>
              <p className="font-medium text-red-600">
                -{expenses.toLocaleString("pl-PL")} zł
              </p>
            </div>
          </div>
        </div>

        {/* Progress budżetu */}
        {monthlyBudget > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wykorzystanie budżetu</span>
              <span
                className={cn(
                  "font-medium",
                  isOverBudget && "text-red-600",
                  isNearLimit && "text-amber-600"
                )}
              >
                {budgetUsedPercent.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={Math.min(budgetUsedPercent, 100)}
              className={cn(
                "h-2",
                isOverBudget && "[&>div]:bg-red-500",
                isNearLimit && "[&>div]:bg-amber-500"
              )}
            />
            {isOverBudget && (
              <Badge variant="destructive" className="text-xs">
                Przekroczono o {(expenses - monthlyBudget).toLocaleString("pl-PL")} zł
              </Badge>
            )}
            {isNearLimit && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                Pozostało {(monthlyBudget - expenses).toLocaleString("pl-PL")} zł
              </Badge>
            )}
          </div>
        )}

        {/* Top kategorie */}
        {sortedCategories.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PieChart className="h-3 w-3" />
              Top kategorie
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sortedCategories.map(([category, amount]) => (
                <Badge
                  key={category}
                  variant="outline"
                  className="text-xs gap-1"
                  style={{
                    borderColor: categoryColors[category] || categoryColors.inne,
                    color: categoryColors[category] || categoryColors.inne,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        categoryColors[category] || categoryColors.inne,
                    }}
                  />
                  {category}: {amount.toLocaleString("pl-PL")} zł
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

