"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Save,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

interface BudgetAlertsProps {
  period: number; // dni
  className?: string;
}

export function BudgetAlerts({ period = 30, className }: BudgetAlertsProps) {
  const [budget, setBudget] = useState<number>(0);
  const [currentSpending, setCurrentSpending] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  useEffect(() => {
    fetchBudgetData();
  }, [period]);

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      // Pobierz aktualny budżet z localStorage lub API
      const savedBudget = localStorage.getItem("monthlyFoodBudget");
      if (savedBudget) {
        setBudget(parseFloat(savedBudget));
      }

      // Oblicz aktualne wydatki
      const response = await fetch(`/api/recipes/usage-stats?days=${period}`);
      if (response.ok) {
        const data = await response.json();

        // Sumuj koszty z historii użycia
        let totalCost = 0;
        for (const history of data.recentHistory || []) {
          // Pobierz cenę produktu
          const inventoryResponse = await fetch(
            `/api/inventory/items?name=${encodeURIComponent(history.ingredient)}`
          );
          if (inventoryResponse.ok) {
            const items = await inventoryResponse.json();
            const item = items[0];
            if (item?.price) {
              totalCost += item.price * history.quantity;
            }
          }
        }

        setCurrentSpending(totalCost);
      }
    } catch (error) {
      console.error("Error fetching budget data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = () => {
    const budgetValue = parseFloat(newBudget);
    if (isNaN(budgetValue) || budgetValue <= 0) {
      toast.error("Wpisz prawidłową wartość budżetu");
      return;
    }

    localStorage.setItem("monthlyFoodBudget", budgetValue.toString());
    setBudget(budgetValue);
    setEditingBudget(false);
    setNewBudget("");
    toast.success("Budżet został zapisany");
  };

  if (loading) {
    return null;
  }

  const percentage = budget > 0 ? (currentSpending / budget) * 100 : 0;
  const remaining = budget - currentSpending;
  const isOverBudget = remaining < 0;
  const isNearLimit = percentage >= 80 && percentage < 100;

  const getStatusColor = () => {
    if (isOverBudget) return "text-red-600";
    if (isNearLimit) return "text-orange-600";
    return "text-green-600";
  };

  const getAlertVariant = () => {
    if (isOverBudget) return "destructive";
    if (isNearLimit) return "default";
    return "default";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budżet Żywieniowy
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingBudget(!editingBudget)}
            >
              {editingBudget ? "Anuluj" : "Ustaw budżet"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formularz edycji budżetu */}
          {editingBudget && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="budget">Miesięczny budżet (zł)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  placeholder="np. 1000"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveBudget} className="mt-6">
                <Save className="h-4 w-4 mr-2" />
                Zapisz
              </Button>
            </div>
          )}

          {budget > 0 ? (
            <>
              {/* Podsumowanie */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Budżet</p>
                  <p className="text-2xl font-bold">{budget.toFixed(2)} zł</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wydano</p>
                  <p className={`text-2xl font-bold ${getStatusColor()}`}>
                    {currentSpending.toFixed(2)} zł
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pozostało</p>
                  <p className={`text-2xl font-bold ${getStatusColor()}`}>
                    {remaining.toFixed(2)} zł
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <Progress value={Math.min(percentage, 100)} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {percentage.toFixed(1)}% budżetu wykorzystane
                </p>
              </div>

              {/* Alerty */}
              {isOverBudget && (
                <Alert variant={getAlertVariant()}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Przekroczenie budżetu!</AlertTitle>
                  <AlertDescription>
                    Przekroczyłeś budżet o {Math.abs(remaining).toFixed(2)} zł.
                    Rozważ optymalizację wydatków.
                  </AlertDescription>
                </Alert>
              )}

              {isNearLimit && !isOverBudget && (
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertTitle>Zbliżasz się do limitu</AlertTitle>
                  <AlertDescription>
                    Wykorzystałeś {percentage.toFixed(1)}% budżetu.
                    Pozostało {remaining.toFixed(2)} zł do końca miesiąca.
                  </AlertDescription>
                </Alert>
              )}

              {!isNearLimit && !isOverBudget && currentSpending > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div className="text-sm">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Świetnie zarządzasz budżetem!
                    </p>
                    <p className="text-green-700 dark:text-green-300">
                      Zostało Ci {remaining.toFixed(2)} zł. Średnio{" "}
                      {(remaining / (30 - period)).toFixed(2)} zł dziennie.
                    </p>
                  </div>
                </div>
              )}

              {/* Rekomendacje */}
              {percentage > 50 && (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-2">💡 Wskazówki oszczędności:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Wybieraj przepisy z najtańszych składników</li>
                    <li>Planuj posiłki z wyprzedzeniem</li>
                    <li>Wykorzystuj produkty przed wygaśnięciem</li>
                    <li>Kupuj produkty sezonowe</li>
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <DollarSign className="h-16 w-16 mx-auto opacity-50 mb-4" />
              <p>Ustaw miesięczny budżet aby śledzić wydatki</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

