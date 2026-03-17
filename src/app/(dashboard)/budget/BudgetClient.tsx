"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subMonths,
} from "date-fns";
import { pl } from "date-fns/locale";
import { sanitizePlainText } from "@/lib/sanitize";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Trash2,
  Filter,
  Settings,
  AlertTriangle,
  Download,
  ArrowRightLeft,
  Upload,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Transaction, Budget } from "@prisma/client";
import { cn } from "@/lib/utils";
import { AccountBalanceChart } from "@/components/charts/AccountBalanceChart";
import { suggestCategory } from "@/lib/categorization";
import { CSVImportDialog } from "@/components/budget/CSVImportDialog";
import { PaymentReminders } from "@/components/budget/PaymentReminders";

type TransactionWithUser = Transaction & {
  user: { id: string; name: string | null; color: string };
  account?: {
    id: string;
    name: string;
    type: string;
    icon: string | null;
    color: string | null;
  } | null;
};

type Member = {
  id: string;
  name: string | null;
  color: string;
};

type AccountInfo = {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  icon: string | null;
  color: string | null;
};

interface BudgetClientProps {
  transactions: TransactionWithUser[];
  budgets: Budget[];
  members: Member[];
  accounts: AccountInfo[];
  currentUserId: string;
}

const expenseCategories = [
  { value: "food", label: "Jedzenie", emoji: "🍕", color: "#F59E0B" },
  { value: "transport", label: "Transport", emoji: "🚗", color: "#3B82F6" },
  { value: "bills", label: "Rachunki", emoji: "📄", color: "#EF4444" },
  { value: "entertainment", label: "Rozrywka", emoji: "🎬", color: "#8B5CF6" },
  { value: "shopping", label: "Zakupy", emoji: "🛍️", color: "#EC4899" },
  { value: "health", label: "Zdrowie", emoji: "💊", color: "#10B981" },
  { value: "home", label: "Dom", emoji: "🏠", color: "#06B6D4" },
  { value: "transfer", label: "Transfer", emoji: "🔄", color: "#6366F1" },
  { value: "other", label: "Inne", emoji: "📦", color: "#6B7280" },
];

const incomeCategories = [
  { value: "salary", label: "Pensja", emoji: "💰", color: "#10B981" },
  { value: "bonus", label: "Premia", emoji: "🎁", color: "#34D399" },
  { value: "freelance", label: "Freelance", emoji: "💻", color: "#059669" },
  { value: "gift", label: "Prezent", emoji: "🎀", color: "#EC4899" },
  { value: "transfer", label: "Transfer", emoji: "🔄", color: "#6366F1" },
  { value: "other", label: "Inne", emoji: "📦", color: "#6B7280" },
];

export function BudgetClient({
  transactions: initialTransactions,
  budgets: initialBudgets,
  members,
  accounts,
  currentUserId,
}: BudgetClientProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [budgetsList, setBudgetsList] = useState(initialBudgets);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");

  // Stan nowego budżetu
  const [newBudget, setNewBudget] = useState({
    category: "" as string | null,
    amount: "",
  });

  // Stan transferu
  const [transfer, setTransfer] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const [newTransaction, setNewTransaction] = useState({
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    amount: "",
    category: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    accountId: "",
  });

  // Obliczenia dla wybranego miesiąca
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const monthTransactions = transactions.filter((t) =>
      isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
    );

    const income = monthTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    // Wydatki per kategoria
    const expensesByCategory = monthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => {
        const cat = t.category || "other";
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      income,
      expenses,
      balance: income - expenses,
      expensesByCategory,
      transactions: monthTransactions,
    };
  }, [transactions, selectedMonth]);

  // Porównanie z poprzednim miesiącem
  const previousMonthStats = useMemo(() => {
    const prevMonth = subMonths(selectedMonth, 1);
    const monthStart = startOfMonth(prevMonth);
    const monthEnd = endOfMonth(prevMonth);

    const monthTransactions = transactions.filter((t) =>
      isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
    );

    return {
      expenses: monthTransactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + t.amount, 0),
    };
  }, [transactions, selectedMonth]);

  // Dane dla wykresu wydatków (ostatnie 6 miesięcy)
  const chartData = useMemo(() => {
    const data: { month: string; expenses: number; income: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTransactions = transactions.filter((t) =>
        isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
      );

      const expenses = monthTransactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + t.amount, 0);

      const income = monthTransactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        month: format(month, "LLL", { locale: pl }),
        expenses,
        income,
      });
    }

    return data;
  }, [transactions]);

  // Filtrowane transakcje
  const filteredTransactions = monthStats.transactions.filter((t) => {
    const categoryMatch = categoryFilter === "all" || t.category === categoryFilter;
    const accountMatch = accountFilter === "all" ||
                         (accountFilter === "no-account" ? !t.accountId : t.accountId === accountFilter);
    return categoryMatch && accountMatch;
  });

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.category) {
      toast.error("Wypełnij wymagane pola");
      return;
    }

    try {
      // SECURITY: Sanityzacja user inputs
      const response = await fetch("/api/budget/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newTransaction.type,
          amount: parseFloat(newTransaction.amount),
          category: sanitizePlainText(newTransaction.category),
          description: sanitizePlainText(newTransaction.description),
          date: new Date(newTransaction.date).toISOString(),
          accountId: newTransaction.accountId && newTransaction.accountId !== "none" ? newTransaction.accountId : null,
        }),
      });

      if (response.ok) {
        const transaction = await response.json();
        setTransactions([transaction, ...transactions]);
        setIsAddDialogOpen(false);
        setNewTransaction({
          type: "EXPENSE",
          amount: "",
          category: "",
          description: "",
          date: format(new Date(), "yyyy-MM-dd"),
          accountId: "",
        });
        toast.success("Transakcja została dodana");
      }
    } catch (error) {
      toast.error("Nie udało się dodać transakcji");
    }
  };

  const handleTransfer = async () => {
    if (!transfer.amount || !transfer.fromAccountId || !transfer.toAccountId) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    if (transfer.fromAccountId === transfer.toAccountId) {
      toast.error("Nie możesz przenieść środków na to samo konto");
      return;
    }

    try {
      // SECURITY: Sanityzacja user inputs
      const response = await fetch("/api/budget/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: transfer.fromAccountId,
          toAccountId: transfer.toAccountId,
          amount: parseFloat(transfer.amount),
          description: sanitizePlainText(transfer.description),
          date: new Date(transfer.date).toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Dodaj obie transakcje do listy
        setTransactions([result.withdrawal, result.deposit, ...transactions]);
        setIsTransferDialogOpen(false);
        setTransfer({
          fromAccountId: "",
          toAccountId: "",
          amount: "",
          description: "",
          date: format(new Date(), "yyyy-MM-dd"),
        });
        toast.success("Transfer został wykonany");
        // Odśwież stronę aby zaktualizować salda kont
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się wykonać transferu");
      }
    } catch (error) {
      toast.error("Nie udało się wykonać transferu");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/budget/transactions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTransactions(transactions.filter((t) => t.id !== id));
        toast.success("Transakcja została usunięta");
      }
    } catch {
      toast.error("Nie udało się usunąć transakcji");
    }
  };

  // Oblicz postęp budżetu dla kategorii
  const getBudgetProgress = (category: string | null) => {
    const budget = budgetsList.find((b) => b.category === category);
    if (!budget) return null;

    const spent = category
      ? monthStats.expensesByCategory[category] || 0
      : monthStats.expenses;

    const percentage = (spent / budget.amount) * 100;
    return {
      budget: budget.amount,
      spent,
      percentage: Math.min(percentage, 100),
      isOverBudget: percentage > 100,
      isWarning: percentage >= 80 && percentage <= 100,
    };
  };

  const handleSaveBudget = async () => {
    if (!newBudget.amount) {
      toast.error("Podaj kwotę budżetu");
      return;
    }

    try {
      const response = await fetch("/api/budget/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newBudget.category || null,
          amount: parseFloat(newBudget.amount),
          period: "MONTHLY",
        }),
      });

      if (response.ok) {
        const budget = await response.json();
        setBudgetsList((prev) => {
          const filtered = prev.filter(
            (b) => b.category !== budget.category
          );
          return [...filtered, budget];
        });
        setNewBudget({ category: "", amount: "" });
        toast.success("Budżet został zapisany");
      }
    } catch {
      toast.error("Nie udało się zapisać budżetu");
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      const response = await fetch(`/api/budget/budgets?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setBudgetsList(budgetsList.filter((b) => b.id !== id));
        toast.success("Budżet został usunięty");
      }
    } catch {
      toast.error("Nie udało się usunąć budżetu");
    }
  };

  const handleExportCSV = () => {
    const monthName = format(selectedMonth, "yyyy-MM", { locale: pl });
    const csvRows = [
      ["Data", "Typ", "Kategoria", "Opis", "Kwota", "Konto", "Osoba"].join(";"),
      ...monthStats.transactions.map((t) => {
        const catInfo = getCategoryInfo(t.category || "other", t.type);
        return [
          format(new Date(t.date), "yyyy-MM-dd"),
          t.type === "INCOME" ? "Przychód" : "Wydatek",
          catInfo.label,
          t.description || "",
          t.amount.toFixed(2).replace(".", ","),
          t.account?.name || "Brak konta",
          t.user.name || "",
        ].join(";");
      }),
    ];

    const csvContent = "\uFEFF" + csvRows.join("\n"); // BOM for Excel
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `budzet-${monthName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Wyeksportowano do CSV");
  };

  const handleExportByAccount = () => {
    const monthName = format(selectedMonth, "yyyy-MM", { locale: pl });

    // Grupowanie transakcji według konta
    const transactionsByAccount = monthStats.transactions.reduce((acc, t) => {
      const accountName = t.account?.name || "Bez konta";
      if (!acc[accountName]) {
        acc[accountName] = [];
      }
      acc[accountName].push(t);
      return acc;
    }, {} as Record<string, typeof monthStats.transactions>);

    // Tworzenie sekcji dla każdego konta
    const sections: string[] = [];

    Object.entries(transactionsByAccount).forEach(([accountName, accountTransactions]) => {
      // Nagłówek sekcji
      sections.push(`\n${accountName}`);
      sections.push("");

      // Nagłówki kolumn
      sections.push(["Data", "Typ", "Kategoria", "Opis", "Kwota", "Osoba"].join(";"));

      // Wiersze transakcji
      accountTransactions.forEach((t) => {
        const catInfo = getCategoryInfo(t.category || "other", t.type);
        sections.push(
          [
            format(new Date(t.date), "yyyy-MM-dd"),
            t.type === "INCOME" ? "Przychód" : "Wydatek",
            catInfo.label,
            t.description || "",
            t.amount.toFixed(2).replace(".", ","),
            t.user.name || "",
          ].join(";")
        );
      });

      // Podsumowanie dla konta
      const totalIncome = accountTransactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = accountTransactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + t.amount, 0);

      sections.push("");
      sections.push(`Suma przychodów;${totalIncome.toFixed(2).replace(".", ",")}`);
      sections.push(`Suma wydatków;${totalExpense.toFixed(2).replace(".", ",")}`);
      sections.push(`Bilans;${(totalIncome - totalExpense).toFixed(2).replace(".", ",")}`);
    });

    // Dodanie podsumowania globalnego
    sections.push("\nPODSUMOWANIE OGÓLNE");
    sections.push("");
    sections.push(`Wszystkie przychody;${monthStats.income.toFixed(2).replace(".", ",")}`);
    sections.push(`Wszystkie wydatki;${monthStats.expenses.toFixed(2).replace(".", ",")}`);
    sections.push(`Bilans ogólny;${monthStats.balance.toFixed(2).replace(".", ",")}`);

    // Tworzenie pliku
    const csvContent = "\uFEFF" + sections.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `budzet-po-kontach-${monthName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Wyeksportowano po kontach do CSV");
  };

  const getCategoryInfo = (category: string, type: string) => {
    const categories = type === "INCOME" ? incomeCategories : expenseCategories;
    return categories.find((c) => c.value === category) || categories[categories.length - 1];
  };

  const expenseChange = previousMonthStats.expenses > 0
    ? ((monthStats.expenses - previousMonthStats.expenses) / previousMonthStats.expenses) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budżet</h1>
          <p className="text-muted-foreground">
            Zarządzaj finansami gospodarstwa domowego
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={format(selectedMonth, "yyyy-MM")}
            onValueChange={(v) => setSelectedMonth(new Date(v + "-01"))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = subMonths(new Date(), i);
                return (
                  <SelectItem key={i} value={format(date, "yyyy-MM")}>
                    {format(date, "LLLL yyyy", { locale: pl })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Eksport CSV
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Eksport standardowy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportByAccount}>
                <Wallet className="mr-2 h-4 w-4" />
                Eksport po kontach
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setIsBudgetDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Budżety
          </Button>
          <Button variant="outline" onClick={() => setIsCSVImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={() => setIsRemindersOpen(true)}>
            <Bell className="mr-2 h-4 w-4" />
            Przypomnienia
          </Button>
          {accounts.length >= 2 && (
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer
            </Button>
          )}
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nowa transakcja
          </Button>
        </div>
      </div>

      {/* Statystyki */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przychody</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{monthStats.income.toFixed(2)} zł
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wydatki</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{monthStats.expenses.toFixed(2)} zł
            </div>
            {expenseChange !== 0 && (
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {expenseChange > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-green-500 mr-1" />
                )}
                {Math.abs(expenseChange).toFixed(0)}% vs poprzedni miesiąc
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bilans</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                monthStats.balance >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {monthStats.balance >= 0 ? "+" : ""}
              {monthStats.balance.toFixed(2)} zł
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transakcje</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthStats.transactions.length}</div>
            <p className="text-xs text-muted-foreground">w tym miesiącu</p>
          </CardContent>
        </Card>
      </div>

      {/* Wydatki per kategoria z budżetami */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wydatki według kategorii</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Budżet całkowity */}
            {(() => {
              const totalBudget = getBudgetProgress(null);
              if (totalBudget) {
                return (
                  <div className="p-3 border rounded-lg bg-muted/30 mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 font-medium">
                        <span>💰</span>
                        Budżet całkowity
                        {totalBudget.isOverBudget && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        {totalBudget.isWarning && !totalBudget.isOverBudget && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                      </span>
                      <span className="font-medium">
                        {totalBudget.spent.toFixed(2)} / {totalBudget.budget.toFixed(2)} zł
                      </span>
                    </div>
                    <Progress
                      value={totalBudget.percentage}
                      className={cn(
                        "h-2",
                        totalBudget.isOverBudget && "[&>div]:bg-red-500",
                        totalBudget.isWarning && !totalBudget.isOverBudget && "[&>div]:bg-yellow-500"
                      )}
                    />
                  </div>
                );
              }
              return null;
            })()}

            {expenseCategories
              .filter((cat) => monthStats.expensesByCategory[cat.value] || budgetsList.some(b => b.category === cat.value))
              .sort((a, b) =>
                (monthStats.expensesByCategory[b.value] || 0) - (monthStats.expensesByCategory[a.value] || 0)
              )
              .map((cat) => {
                const amount = monthStats.expensesByCategory[cat.value] || 0;
                const percentage = monthStats.expenses > 0 ? (amount / monthStats.expenses) * 100 : 0;
                const budgetProgress = getBudgetProgress(cat.value);

                return (
                  <div key={cat.value} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        {cat.label}
                        {budgetProgress?.isOverBudget && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                        {budgetProgress?.isWarning && !budgetProgress?.isOverBudget && (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        )}
                      </span>
                      <span className="font-medium">
                        {amount.toFixed(2)} zł
                        {budgetProgress && (
                          <span className="text-muted-foreground text-xs ml-1">
                            / {budgetProgress.budget.toFixed(2)} zł
                          </span>
                        )}
                      </span>
                    </div>
                    <Progress
                      value={budgetProgress ? budgetProgress.percentage : percentage}
                      className={cn(
                        "h-2",
                        budgetProgress?.isOverBudget && "[&>div]:bg-red-500",
                        budgetProgress?.isWarning && !budgetProgress?.isOverBudget && "[&>div]:bg-yellow-500"
                      )}
                      style={!budgetProgress ? { "--progress-color": cat.color } as React.CSSProperties : undefined}
                    />
                  </div>
                );
              })}
            {Object.keys(monthStats.expensesByCategory).length === 0 && budgetsList.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                Brak wydatków w tym miesiącu
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wykres wydatków w czasie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Wydatki i przychody w czasie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const maxValue = Math.max(
              ...chartData.map((d) => Math.max(d.expenses, d.income)),
              1
            );
            const chartHeight = 200;
            const chartWidth = 100; // procenty
            const barWidth = chartWidth / chartData.length;

            return (
              <div className="space-y-4">
                {/* Wykres */}
                <div className="relative h-[200px] flex items-end gap-2">
                  {chartData.map((data, index) => {
                    const expenseHeight = (data.expenses / maxValue) * chartHeight;
                    const incomeHeight = (data.income / maxValue) * chartHeight;

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex-1 w-full flex items-end justify-center gap-1">
                          {/* Słupek przychodów */}
                          <div
                            className="w-1/3 bg-green-500 rounded-t transition-all duration-300 hover:opacity-80"
                            style={{ height: `${incomeHeight}px` }}
                            title={`Przychody: ${data.income.toFixed(2)} zł`}
                          />
                          {/* Słupek wydatków */}
                          <div
                            className="w-1/3 bg-red-500 rounded-t transition-all duration-300 hover:opacity-80"
                            style={{ height: `${expenseHeight}px` }}
                            title={`Wydatki: ${data.expenses.toFixed(2)} zł`}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {data.month}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Przychody</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span>Wydatki</span>
                  </div>
                </div>

                {/* Podsumowanie */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Suma przychodów (6 mies.)</p>
                    <p className="text-lg font-bold text-green-600">
                      +{chartData.reduce((sum, d) => sum + d.income, 0).toFixed(2)} zł
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Suma wydatków (6 mies.)</p>
                    <p className="text-lg font-bold text-red-600">
                      -{chartData.reduce((sum, d) => sum + d.expenses, 0).toFixed(2)} zł
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Statystyki per konto */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Statystyki kont
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account) => {
                // Filtruj transakcje dla tego konta w wybranym miesiącu
                const accountTransactions = monthStats.transactions.filter(
                  (t) => t.accountId === account.id
                );

                const income = accountTransactions
                  .filter((t) => t.type === "INCOME")
                  .reduce((sum, t) => sum + t.amount, 0);

                const expenses = accountTransactions
                  .filter((t) => t.type === "EXPENSE")
                  .reduce((sum, t) => sum + t.amount, 0);

                const balance = income - expenses;

                // Wydatki per kategoria dla tego konta
                const expensesByCategory = accountTransactions
                  .filter((t) => t.type === "EXPENSE")
                  .reduce((acc, t) => {
                    const cat = t.category || "other";
                    acc[cat] = (acc[cat] || 0) + t.amount;
                    return acc;
                  }, {} as Record<string, number>);

                const topCategories = Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3);

                return (
                  <div
                    key={account.id}
                    className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    {/* Nagłówek konta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{account.icon || "💳"}</span>
                        <div>
                          <h3 className="font-semibold">{account.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {accountTransactions.length === 0
                              ? "Brak transakcji w tym miesiącu"
                              : `${accountTransactions.length} ${accountTransactions.length === 1 ? "transakcja" : "transakcje"}`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Saldo konta</p>
                        <p className="text-lg font-bold">{account.balance.toFixed(2)} {account.currency}</p>
                      </div>
                    </div>

                    {accountTransactions.length > 0 ? (
                      <>
                        {/* Statystyki miesiąca */}
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Przychody</p>
                            <p className="font-semibold text-green-600">+{income.toFixed(2)}</p>
                          </div>
                          <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Wydatki</p>
                            <p className="font-semibold text-red-600">-{expenses.toFixed(2)}</p>
                          </div>
                          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Bilans</p>
                            <p className={cn("font-semibold", balance >= 0 ? "text-green-600" : "text-red-600")}>
                              {balance >= 0 ? "+" : ""}{balance.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Top kategorie wydatków */}
                        {topCategories.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Największe wydatki:
                            </p>
                            {topCategories.map(([category, amount]) => {
                              const catInfo = getCategoryInfo(category, "EXPENSE");
                              const percentage = expenses > 0 ? (amount / expenses) * 100 : 0;
                              return (
                                <div key={category} className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1">
                                    <span>{catInfo.emoji}</span>
                                    <span>{catInfo.label}</span>
                                  </span>
                                  <span className="font-medium">
                                    {amount.toFixed(2)} zł ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Wykres historii salda (ostatnie 30 dni) */}
                        <div className="mt-4">
                          <AccountBalanceChart
                            accountId={account.id}
                            currentBalance={account.balance}
                            transactions={transactions}
                            currency={account.currency}
                            days={30}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Dodaj transakcję z tym kontem aby zobaczyć statystyki
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista transakcji */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Historia transakcji</CardTitle>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[150px]">
                <Wallet className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Konto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie konta</SelectItem>
                <SelectItem value="no-account">Bez konta</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.icon || "💳"} {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak transakcji
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => {
                const catInfo = getCategoryInfo(transaction.category || "other", transaction.type);

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{catInfo.emoji}</div>
                      <div>
                        <div className="font-medium">
                          {transaction.description || catInfo.label}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(transaction.date), "d MMM yyyy", { locale: pl })}
                          {transaction.user && ` • ${transaction.user.name}`}
                          {transaction.account && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              <span>{transaction.account.icon || "💳"}</span>
                              <span>{transaction.account.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-semibold",
                          transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {transaction.type === "INCOME" ? "+" : "-"}
                        {transaction.amount.toFixed(2)} zł
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog dodawania transakcji */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowa transakcja</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Tabs
              value={newTransaction.type}
              onValueChange={(v) =>
                setNewTransaction({ ...newTransaction, type: v as "INCOME" | "EXPENSE", category: "" })
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="EXPENSE">Wydatek</TabsTrigger>
                <TabsTrigger value="INCOME">Przychód</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>Kwota</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select
                value={newTransaction.category}
                onValueChange={(v) => setNewTransaction({ ...newTransaction, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {(newTransaction.type === "INCOME" ? incomeCategories : expenseCategories).map(
                    (cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Konto (opcjonalnie)</Label>
              <Select
                value={newTransaction.accountId}
                onValueChange={(v) => setNewTransaction({ ...newTransaction, accountId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz konto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak konta</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2">
                        {account.icon || "💳"} {account.name}
                        <span className="text-xs text-muted-foreground">
                          ({account.balance.toFixed(2)} {account.currency})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Opis (opcjonalnie)</Label>
              <Input
                placeholder="Np. Zakupy w Biedronce"
                value={newTransaction.description}
                onChange={(e) => {
                  const description = e.target.value;
                  setNewTransaction({ ...newTransaction, description });

                  // Auto-kategoryzacja jeśli kategoria nie została jeszcze wybrana
                  if (!newTransaction.category && description.length > 3) {
                    const suggested = suggestCategory(description, newTransaction.type);
                    if (suggested) {
                      setNewTransaction((prev) => ({ ...prev, category: suggested }));
                    }
                  }
                }}
              />
              {newTransaction.category && newTransaction.description.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  💡 Sugerowana kategoria:{" "}
                  {(newTransaction.type === "INCOME" ? incomeCategories : expenseCategories)
                    .find((c) => c.value === newTransaction.category)
                    ?.label || "Inna"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddTransaction}>Dodaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog zarządzania budżetami */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Zarządzaj budżetami</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Formularz nowego budżetu */}
            <div className="flex gap-2">
              <Select
                value={newBudget.category || "total"}
                onValueChange={(v) => setNewBudget({ ...newBudget, category: v === "total" ? null : v })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Kategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">💰 Budżet całkowity</SelectItem>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Kwota"
                className="w-32"
                value={newBudget.amount}
                onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
              />
              <Button onClick={handleSaveBudget}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista budżetów */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {budgetsList.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Brak zdefiniowanych budżetów
                </p>
              ) : (
                budgetsList.map((budget) => {
                  const catInfo = budget.category
                    ? expenseCategories.find((c) => c.value === budget.category)
                    : null;
                  const progress = getBudgetProgress(budget.category);

                  return (
                    <div
                      key={budget.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <span className="text-xl">
                        {catInfo?.emoji || "💰"}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {catInfo?.label || "Budżet całkowity"}
                          </span>
                          <span className="text-sm font-medium">
                            {budget.amount.toFixed(2)} zł
                          </span>
                        </div>
                        {progress && (
                          <div className="mt-1">
                            <Progress
                              value={progress.percentage}
                              className={cn(
                                "h-1.5",
                                progress.isOverBudget && "[&>div]:bg-red-500",
                                progress.isWarning && "[&>div]:bg-yellow-500"
                              )}
                            />
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {progress.spent.toFixed(2)} zł z {budget.amount.toFixed(2)} zł
                              {progress.isOverBudget && (
                                <span className="text-red-500 ml-1">
                                  (przekroczono o {(progress.spent - budget.amount).toFixed(2)} zł)
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteBudget(budget.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog transferu między kontami */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer między kontami</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Z konta</Label>
              <Select
                value={transfer.fromAccountId}
                onValueChange={(v) => setTransfer({ ...transfer, fromAccountId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz konto źródłowe" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2">
                        {account.icon || "💳"} {account.name}
                        <span className="text-xs text-muted-foreground">
                          ({account.balance.toFixed(2)} {account.currency})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Na konto</Label>
              <Select
                value={transfer.toAccountId}
                onValueChange={(v) => setTransfer({ ...transfer, toAccountId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz konto docelowe" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((acc) => acc.id !== transfer.fromAccountId)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <span className="flex items-center gap-2">
                          {account.icon || "💳"} {account.name}
                          <span className="text-xs text-muted-foreground">
                            ({account.balance.toFixed(2)} {account.currency})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kwota</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={transfer.amount}
                onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })}
              />
              {transfer.fromAccountId && (
                <p className="text-xs text-muted-foreground">
                  Dostępne środki: {accounts.find((a) => a.id === transfer.fromAccountId)?.balance.toFixed(2)} {accounts.find((a) => a.id === transfer.fromAccountId)?.currency}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Opis (opcjonalnie)</Label>
              <Input
                placeholder="Np. Przeniesienie oszczędności"
                value={transfer.description}
                onChange={(e) => setTransfer({ ...transfer, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={transfer.date}
                onChange={(e) => setTransfer({ ...transfer, date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleTransfer}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Wykonaj transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={isCSVImportOpen}
        onOpenChange={setIsCSVImportOpen}
        accounts={accounts}
        onImportComplete={() => {
          // Reload transactions
          window.location.reload();
        }}
      />

      {/* Payment Reminders Dialog */}
      <PaymentReminders
        open={isRemindersOpen}
        onOpenChange={setIsRemindersOpen}
        categories={[...expenseCategories, ...incomeCategories].map(c => ({
          id: c.value,
          name: c.label,
          color: c.color || '#6B7280',
        }))}
      />
    </div>
  );
}

