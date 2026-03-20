"use client";

import { useState } from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, Edit, Trash2, Eye, EyeOff, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FinancialAccount, Transaction } from "@prisma/client";
import { AccountBalanceChart } from "@/components/charts/AccountBalanceChart";

type AccountWithCount = FinancialAccount & {
  _count: { transactions: number };
};

type TransactionWithDetails = Transaction & {
  user: { id: string; name: string | null; color: string } | null;
  account: FinancialAccount | null;
};

interface FinancialAccountsClientProps {
  initialAccounts: AccountWithCount[];
  recentTransactions: TransactionWithDetails[];
}

const accountTypeLabels: Record<string, string> = {
  BANK: "Konto bankowe",
  CASH: "Gotówka",
  SAVINGS: "Oszczędności",
  INVESTMENT: "Inwestycje",
  OTHER: "Inne",
};

const accountTypeIcons: Record<string, string> = {
  BANK: "🏦",
  CASH: "💵",
  SAVINGS: "🐷",
  INVESTMENT: "📈",
  OTHER: "💰",
};

const accountTypeColors: Record<string, string> = {
  BANK: "bg-blue-500",
  CASH: "bg-green-500",
  SAVINGS: "bg-purple-500",
  INVESTMENT: "bg-orange-500",
  OTHER: "bg-gray-500",
};

export function FinancialAccountsClient({
  initialAccounts,
  recentTransactions,
}: FinancialAccountsClientProps) {
  const [accounts, setAccounts] = useState<AccountWithCount[]>(initialAccounts);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountWithCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithCount | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const [newAccount, setNewAccount] = useState<{
    name: string;
    type: "BANK" | "CASH" | "SAVINGS" | "INVESTMENT" | "OTHER";
    balance: number;
    currency: string;
    color: string;
    icon: string;
  }>({
    name: "",
    type: "BANK",
    balance: 0,
    currency: "PLN",
    color: "#3B82F6",
    icon: "",
  });

  // Oblicz całkowity majątek
  const totalBalance = accounts
    .filter((acc) => acc.isActive)
    .reduce((sum, acc) => sum + acc.balance, 0);

  const handleAddAccount = async () => {
    if (!newAccount.name) {
      toast.error("Podaj nazwę konta");
      return;
    }

    try {
      const response = await fetch("/api/financial-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });

      if (response.ok) {
        const account = await response.json();
        setAccounts([account, ...accounts]);
        setIsAddDialogOpen(false);
        setNewAccount({
          name: "",
          type: "BANK",
          balance: 0,
          currency: "PLN",
          color: "#3B82F6",
          icon: "",
        });
        toast.success("Konto zostało dodane");
      } else {
        toast.error("Nie udało się dodać konta");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;

    try {
      const response = await fetch(`/api/financial-accounts/${editingAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingAccount.name,
          type: editingAccount.type,
          balance: editingAccount.balance,
          currency: editingAccount.currency,
          color: editingAccount.color,
          icon: editingAccount.icon,
          isActive: editingAccount.isActive,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setAccounts(accounts.map((acc) => (acc.id === updated.id ? { ...acc, ...updated } : acc)));
        setIsEditDialogOpen(false);
        setEditingAccount(null);
        toast.success("Konto zostało zaktualizowane");
      } else {
        toast.error("Nie udało się zaktualizować konta");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to konto?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/financial-accounts/${accountId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAccounts(accounts.filter((acc) => acc.id !== accountId));
        toast.success("Konto zostało usunięte");
      } else {
        const data = await response.json();
        toast.error(data.error || "Nie udało się usunąć konta");
      }
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (account: AccountWithCount) => {
    setEditingAccount({ ...account });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Majątek</h1>
          <p className="text-muted-foreground">
            Zarządzaj swoimi kontami i śledź finanse
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBalances(!showBalances)}
          >
            {showBalances ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showBalances ? "Ukryj salda" : "Pokaż salda"}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj konto
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Całkowity majątek
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {showBalances ? `${totalBalance.toFixed(2)} PLN` : "••••••"}
          </div>
          <p className="text-sm text-blue-100 mt-2">
            {accounts.filter((acc) => acc.isActive).length} aktywnych kont
          </p>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => {
          const icon = account.icon || accountTypeIcons[account.type];
          const colorClass = accountTypeColors[account.type];

          return (
            <Card
              key={account.id}
              className={cn(
                "hover:shadow-lg transition-shadow",
                !account.isActive && "opacity-60"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-3 rounded-lg text-2xl",
                        colorClass,
                        "text-white"
                      )}
                    >
                      {icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {accountTypeLabels[account.type]}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedAccount(account);
                        setIsDetailsDialogOpen(true);
                      }}
                      title="Historia salda"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(account)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteAccount(account.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {showBalances ? account.balance.toFixed(2) : "••••"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {account.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{account._count.transactions} transakcji</span>
                    {!account.isActive && (
                      <Badge variant="secondary">Nieaktywne</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ostatnie transakcje</CardTitle>
            <CardDescription>Najnowsze operacje finansowe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTransactions.slice(0, 10).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-full",
                        transaction.type === "INCOME"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      )}
                    >
                      {transaction.type === "INCOME" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.description || transaction.category || "Transakcja"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.account?.name || "Brak konta"} •{" "}
                        {new Date(transaction.date).toLocaleDateString("pl-PL")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-semibold",
                        transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {transaction.type === "INCOME" ? "+" : "-"}
                      {transaction.amount.toFixed(2)} PLN
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj nowe konto</DialogTitle>
            <DialogDescription>
              Utwórz konto do śledzenia Twoich finansów
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nazwa konta</Label>
              <Input
                placeholder="np. Revolut, Gotówka"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ konta</Label>
                <Select
                  value={newAccount.type}
                  onValueChange={(value) => setNewAccount({ ...newAccount, type: value as typeof newAccount.type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {accountTypeIcons[value]} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Waluta</Label>
                <Select
                  value={newAccount.currency}
                  onValueChange={(value) => setNewAccount({ ...newAccount, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLN">PLN</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Saldo początkowe</Label>
              <Input
                type="number"
                step="0.01"
                value={newAccount.balance}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, balance: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Ikona (emoji)</Label>
              <Input
                placeholder="np. 💳, 💰, 🏦"
                value={newAccount.icon}
                onChange={(e) => setNewAccount({ ...newAccount, icon: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddAccount}>Dodaj konto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj konto</DialogTitle>
            <DialogDescription>Zaktualizuj dane konta</DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nazwa konta</Label>
                <Input
                  value={editingAccount.name}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Typ konta</Label>
                  <Select
                    value={editingAccount.type}
                    onValueChange={(value) =>
                      setEditingAccount({ ...editingAccount, type: value as typeof editingAccount.type })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(accountTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {accountTypeIcons[value]} {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Waluta</Label>
                  <Select
                    value={editingAccount.currency}
                    onValueChange={(value) =>
                      setEditingAccount({ ...editingAccount, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLN">PLN</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Saldo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingAccount.balance}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      balance: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Ikona (emoji)</Label>
                <Input
                  placeholder="np. 💳, 💰, 🏦"
                  value={editingAccount.icon || ""}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, icon: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingAccount.isActive}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="font-normal cursor-pointer">
                  Konto aktywne
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingAccount(null);
              }}
            >
              Anuluj
            </Button>
            <Button onClick={handleUpdateAccount}>Zapisz zmiany</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Balance History Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Historia salda: {selectedAccount?.name}
            </DialogTitle>
            <DialogDescription>
              Zmiany salda w ciągu ostatnich 30 dni
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <AccountBalanceChart
              accountId={selectedAccount.id}
              currentBalance={selectedAccount.balance}
              transactions={recentTransactions}
              currency={selectedAccount.currency}
              days={30}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailsDialogOpen(false);
                setSelectedAccount(null);
              }}
            >
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

