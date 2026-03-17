"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BudgetAlert {
  type: "warning" | "danger";
  percentage: number;
  message: string;
  totalSpent: number;
  plannedBudget: number;
}

interface TripBudgetAlertsProps {
  tripId: string;
  plannedBudget?: number | null;
}

export function TripBudgetAlerts({ tripId, plannedBudget }: TripBudgetAlertsProps) {
  const [alert, setAlert] = useState<BudgetAlert | null>(null);

  useEffect(() => {
    if (!plannedBudget) return;

    const checkBudget = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/expenses`);
        if (!response.ok) return;

        const expenses = await response.json() as Array<{ amount: number }>;
        const totalSpent = expenses.reduce((sum: number, exp) => sum + exp.amount, 0);
        const percentage = (totalSpent / plannedBudget) * 100;

        if (percentage >= 80 && percentage < 100) {
          setAlert({
            type: "warning",
            percentage,
            message: `⚠️ Wykorzystano ${percentage.toFixed(0)}% budżetu!`,
            totalSpent,
            plannedBudget,
          });
        } else if (percentage >= 100) {
          setAlert({
            type: "danger",
            percentage,
            message: `🚨 Przekroczono budżet o ${(totalSpent - plannedBudget).toFixed(2)} PLN!`,
            totalSpent,
            plannedBudget,
          });
        } else {
          setAlert(null);
        }
      } catch (error) {
        console.error("Error checking budget:", error);
      }
    };

    checkBudget();
    // Sprawdzaj co 30 sekund
    const interval = setInterval(checkBudget, 30000);

    return () => clearInterval(interval);
  }, [tripId, plannedBudget]);

  if (!alert) return null;

  return (
    <Alert variant={alert.type === "danger" ? "destructive" : "default"} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium">{alert.message}</div>
        <div className="text-sm mt-1">
          Wydano: {alert.totalSpent.toFixed(2)} PLN z {alert.plannedBudget.toFixed(2)} PLN
        </div>
        {alert.type === "warning" && (
          <div className="text-sm mt-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Sugestia: Rozważ ograniczenie wydatków lub zwiększenie budżetu
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
