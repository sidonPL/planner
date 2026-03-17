"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Plus,
  DollarSign,
  Trash2,
  Car,
  Building,
  UtensilsCrossed,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
  ArrowRight,
  Users,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Balance {
  userId: string;
  userName: string;
  balance: number;
  color?: string;
}

interface Settlement {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

interface SettlementsData {
  balances: Balance[];
  settlements: Settlement[];
  totalExpenses: number;
}

interface TripExpense {
  id: string;
  name: string;
  amount: number;
  currency?: string;
  category: string | null;
  paidById: string | null;
  date: Date;
  notes: string | null;
}

interface TripBudgetProps {
  tripId: string;
  plannedBudget: number | null;
  expenses: TripExpense[];
  members: { id: string; name: string | null; color: string }[];
  onExpensesChange: (expenses: TripExpense[]) => void;
  onBudgetChange: (budget: number | null) => void;
}

const expenseCategories = [
  { value: "transport", label: "Transport", icon: Car },
  { value: "accommodation", label: "Nocleg", icon: Building },
  { value: "food", label: "Jedzenie", icon: UtensilsCrossed },
  { value: "attractions", label: "Atrakcje", icon: Ticket },
  { value: "shopping", label: "Zakupy", icon: ShoppingBag },
  { value: "other", label: "Inne", icon: MoreHorizontal },
];

export function TripBudget({
  tripId,
  plannedBudget,
  expenses,
  members,
  onExpensesChange,
  onBudgetChange,
}: TripBudgetProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements'>('expenses');
  const [newExpense, setNewExpense] = useState({
    name: "",
    amount: "",
    currency: "PLN",
    category: "other",
    paidById: "",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });
  const [selectedSplits, setSelectedSplits] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [splitMode, setSplitMode] = useState<'even' | 'custom'>('even');
  const [settlements, setSettlements] = useState<SettlementsData | null>(null);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [budgetValue, setBudgetValue] = useState(plannedBudget?.toString() || "");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  // Load exchange rates
  useEffect(() => {
    const loadRates = async () => {
      try {
        const response = await fetch('/api/currency/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base: 'PLN' }),
        });
        if (response.ok) {
          const data = await response.json();
          setExchangeRates(data.rates);
        }
      } catch (error) {
        console.error('Failed to load exchange rates:', error);
      }
    };
    loadRates();
  }, []);

  // Load settlements when switching to settlements tab
  const loadSettlements = async () => {
    setLoadingSettlements(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/settlements`);
      if (response.ok) {
        const data = await response.json();
        setSettlements(data);
      }
    } catch (error) {
      console.error('Error loading settlements:', error);
    } finally {
      setLoadingSettlements(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'settlements') {
      loadSettlements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tripId]);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = plannedBudget ? plannedBudget - totalSpent : null;
  const percentSpent = plannedBudget ? (totalSpent / plannedBudget) * 100 : 0;

  // Wydatki per kategoria
  const expensesByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || "other";
    acc[cat] = (acc[cat] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  // Split handlers
  const toggleSplit = (userId: string) => {
    if (selectedSplits.includes(userId)) {
      setSelectedSplits(selectedSplits.filter(id => id !== userId));
    } else {
      setSelectedSplits([...selectedSplits, userId]);
    }
  };

  const dividEvenly = () => {
    if (!newExpense.amount || selectedSplits.length === 0) return;

    const amount = parseFloat(newExpense.amount);
    const perPerson = amount / selectedSplits.length;
    const rounded = Math.round(perPerson * 100) / 100;

    const newCustomSplits: Record<string, string> = {};
    selectedSplits.forEach((userId) => {
      newCustomSplits[userId] = rounded.toString();
    });

    setCustomSplits(newCustomSplits);
    setSplitMode('custom');
  };

  const handleAddExpense = async () => {
    if (!newExpense.name.trim() || !newExpense.amount) {
      toast.error("Podaj nazwę i kwotę");
      return;
    }

    // Przygotuj splits
    let splits: Array<{ userId: string; amount: number }> = [];

    if (selectedSplits.length > 0) {
      if (splitMode === 'even') {
        const amount = parseFloat(newExpense.amount);
        const perPerson = amount / selectedSplits.length;
        const rounded = Math.round(perPerson * 100) / 100;

        splits = selectedSplits.map((userId) => ({
          userId,
          amount: rounded,
        }));
      } else {
        splits = selectedSplits.map((userId) => ({
          userId,
          amount: parseFloat(customSplits[userId] || '0'),
        }));
      }
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newExpense,
          amount: parseFloat(newExpense.amount),
          paidById: newExpense.paidById || null,
          splits: splits.length > 0 ? splits : undefined,
        }),
      });

      if (response.ok) {
        const expense = await response.json();
        onExpensesChange([expense, ...expenses]);
        setIsAddDialogOpen(false);
        setNewExpense({
          name: "",
          amount: "",
          currency: "PLN",
          category: "other",
          paidById: "",
          date: format(new Date(), "yyyy-MM-dd"),
          notes: "",
        });
        setSelectedSplits([]);
        setCustomSplits({});
        setSplitMode('even');
        toast.success("Wydatek został dodany");

        // Reload settlements if on that tab
        if (activeTab === 'settlements') {
          loadSettlements();
        }
      } else {
        toast.error("Nie udało się dodać wydatku");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onExpensesChange(expenses.filter((e) => e.id !== expenseId));
        toast.success("Wydatek został usunięty");
      }
    } catch {
      toast.error("Nie udało się usunąć wydatku");
    }
  };

  const handleSaveBudget = async () => {
    const budget = budgetValue ? parseFloat(budgetValue) : null;
    
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannedBudget: budget }),
      });

      if (response.ok) {
        onBudgetChange(budget);
        setIsBudgetDialogOpen(false);
        toast.success("Budżet został zapisany");
      }
    } catch {
      toast.error("Nie udało się zapisać budżetu");
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/export/settlements-pdf`, {
        method: 'POST',
      });

      if (response.ok) {
        const html = await response.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      } else {
        toast.error('Nie udało się wygenerować PDF');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Wystąpił błąd podczas exportu');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budżet wyjazdu
          </h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsBudgetDialogOpen(true)}>
            Ustaw budżet
          </Button>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj wydatek
          </Button>
        </div>
      </div>

      {/* Tabs: Wydatki / Rozliczenia */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expenses' | 'settlements')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">
            <DollarSign className="h-4 w-4 mr-2" />
            Wydatki
          </TabsTrigger>
          <TabsTrigger value="settlements">
            <Users className="h-4 w-4 mr-2" />
            Rozliczenia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          {/* Existing expenses UI */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Planowany</p>
              <p className="text-xl font-bold">
                {plannedBudget ? `${plannedBudget.toFixed(0)} zł` : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Wydano</p>
              <p className="text-xl font-bold text-red-600">{totalSpent.toFixed(0)} zł</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pozostało</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  remaining !== null && remaining < 0 ? "text-red-600" : "text-green-600"
                )}
              >
                {remaining !== null ? `${remaining.toFixed(0)} zł` : "—"}
              </p>
            </div>
          </div>

          {plannedBudget && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Wykorzystanie budżetu</span>
                <span>{Math.min(percentSpent, 100).toFixed(0)}%</span>
              </div>
              <Progress
                value={Math.min(percentSpent, 100)}
                className={cn(
                  "h-2",
                  percentSpent > 100 && "[&>div]:bg-red-500",
                  percentSpent > 80 && percentSpent <= 100 && "[&>div]:bg-yellow-500"
                )}
              />
            </div>
          )}

          {/* Wydatki per kategoria */}
          {Object.keys(expensesByCategory).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Wydatki wg kategorii</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(expensesByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => {
                    const catInfo = expenseCategories.find((c) => c.value === cat) || expenseCategories[5];
                    const Icon = catInfo.icon;
                    return (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Icon className="h-3 w-3" />
                          {catInfo.label}
                        </span>
                        <span className="font-medium">{amount.toFixed(0)} zł</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista wydatków */}
      {expenses.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Historia wydatków</h4>
          {expenses.map((expense) => {
            const catInfo = expenseCategories.find((c) => c.value === expense.category) || expenseCategories[5];
            const Icon = catInfo.icon;
            const paidBy = members.find((m) => m.id === expense.paidById);

            return (
              <Card key={expense.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{expense.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.date), "d MMM yyyy", { locale: pl })}
                          {paidBy && ` • ${paidBy.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="font-semibold text-red-600">
                          -{expense.amount.toFixed(0)} {expense.currency || 'PLN'}
                        </span>
                        {expense.currency && expense.currency !== 'PLN' && exchangeRates[expense.currency] && (
                          <p className="text-xs text-muted-foreground">
                            ≈ {Math.round(expense.amount / exchangeRates[expense.currency])} PLN
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </TabsContent>

        {/* Tab Rozliczenia */}
        <TabsContent value="settlements" className="space-y-4">
          {loadingSettlements ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Ładowanie rozliczeń...
              </CardContent>
            </Card>
          ) : !settlements ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Brak danych rozliczeniowych
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Export PDF button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Eksportuj PDF
                </Button>
              </div>

              {/* Balance per osoba */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Rozliczenia per osoba</h4>
                  <div className="space-y-2">
                    {settlements.balances?.map((balance) => (
                      <div key={balance.userId} className="flex items-center justify-between p-2 rounded border">
                        <span className="font-medium">{balance.userName}</span>
                        {balance.balance > 0 ? (
                          <Badge className="bg-green-600">
                            +{balance.balance.toFixed(2)} PLN <span className="ml-1 text-xs">(dostaje)</span>
                          </Badge>
                        ) : balance.balance < 0 ? (
                          <Badge className="bg-red-600">
                            {balance.balance.toFixed(2)} PLN <span className="ml-1 text-xs">(płaci)</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline">Rozliczony</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Plan rozliczeń */}
              {settlements.settlements && settlements.settlements.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">
                      Plan rozliczeń ({settlements.settlements.length} transakcji)
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Minimalna liczba przelewów aby wszystkich rozliczyć
                    </p>
                    <div className="space-y-2">
                      {settlements.settlements.map((settlement, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded border bg-muted/30">
                          <span className="font-medium text-sm">{index + 1}.</span>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-medium">{settlement.fromUserName}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{settlement.toUserName}</span>
                          </div>
                          <Badge variant="secondary" className="font-semibold">
                            {settlement.amount.toFixed(2)} {settlement.currency}
                          </Badge>
                          <Button size="sm" variant="outline">
                            Oznacz zapłacone
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {settlements.settlements && settlements.settlements.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-lg font-medium mb-1">🎉 Wszyscy rozliczeni!</p>
                    <p className="text-sm text-muted-foreground">
                      Nie ma żadnych zaległości
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog dodawania wydatku */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj wydatek</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nazwa *</Label>
              <Input
                placeholder="np. Bilet do muzeum"
                value={newExpense.name}
                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kwota *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Waluta</Label>
                <Select
                  value={newExpense.currency}
                  onValueChange={(v) => setNewExpense({ ...newExpense, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLN">PLN</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select
                value={newExpense.category}
                onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {cat.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Zapłacił/a</Label>
                <Select
                  value={newExpense.paidById}
                  onValueChange={(v) => setNewExpense({ ...newExpense, paidById: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz osobę" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Split selector */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-base">Podziel wydatek</Label>
                {selectedSplits.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={dividEvenly}
                  >
                    Podziel równo
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedSplits.includes(member.id)}
                      onCheckedChange={() => toggleSplit(member.id)}
                    />
                    <span className="flex-1">{member.name}</span>
                    {selectedSplits.includes(member.id) && splitMode === 'custom' && (
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        placeholder="0.00"
                        value={customSplits[member.id] || ''}
                        onChange={(e) =>
                          setCustomSplits({ ...customSplits, [member.id]: e.target.value })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              {selectedSplits.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Wybrano: {selectedSplits.length} osób
                  {newExpense.amount && splitMode === 'even' &&
                    ` · ${(parseFloat(newExpense.amount) / selectedSplits.length).toFixed(2)} ${newExpense.currency} na osobę`
                  }
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddExpense}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj wydatek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ustawiania budżetu */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ustaw budżet wyjazdu</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Planowany budżet (zł)</Label>
              <Input
                type="number"
                step="1"
                placeholder="np. 5000"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pozostaw puste, jeśli nie chcesz ustawiać limitu
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveBudget}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

