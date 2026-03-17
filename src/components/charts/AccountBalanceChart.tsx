"use client";

import { useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { pl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  date: Date;
  accountId: string | null;
}

interface AccountBalanceChartProps {
  accountId: string;
  currentBalance: number;
  transactions: Transaction[];
  currency?: string;
  days?: number;
}

export function AccountBalanceChart({
  accountId,
  currentBalance,
  transactions,
  currency = "PLN",
  days = 30,
}: AccountBalanceChartProps) {
  // Oblicz historię salda dla ostatnich N dni
  const balanceHistory = useMemo(() => {
    const today = startOfDay(new Date());
    const history: { date: Date; balance: number }[] = [];

    // Filtruj transakcje dla tego konta
    const accountTransactions = transactions
      .filter((t) => t.accountId === accountId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Oblicz saldo początkowe (obecne saldo - suma wszystkich transakcji)
    let startBalance = currentBalance;
    accountTransactions.forEach((t) => {
      if (t.type === "INCOME") {
        startBalance -= t.amount;
      } else {
        startBalance += t.amount;
      }
    });

    // Generuj punkty dla każdego dnia
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Oblicz saldo na koniec tego dnia
      let balance = startBalance;
      accountTransactions.forEach((t) => {
        const transactionDate = new Date(t.date);
        if (transactionDate <= dayEnd) {
          if (t.type === "INCOME") {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        }
      });

      history.push({ date, balance });
    }

    return history;
  }, [accountId, currentBalance, transactions, days]);

  // Znajdź min i max dla osi Y
  const minBalance = Math.min(...balanceHistory.map((h) => h.balance));
  const maxBalance = Math.max(...balanceHistory.map((h) => h.balance));
  const range = maxBalance - minBalance;
  const padding = range * 0.1 || 100; // 10% padding lub 100 jeśli range = 0

  const yMin = minBalance - padding;
  const yMax = maxBalance + padding;
  const yRange = yMax - yMin;

  // Oblicz zmianę w okresie
  const startBalance = balanceHistory[0]?.balance || 0;
  const endBalance = balanceHistory[balanceHistory.length - 1]?.balance || 0;
  const change = endBalance - startBalance;
  const changePercent = startBalance !== 0 ? (change / Math.abs(startBalance)) * 100 : 0;

  // Generuj punkty SVG
  const chartWidth = 600;
  const chartHeight = 200;
  const points = balanceHistory
    .map((item, index) => {
      const x = (index / (balanceHistory.length - 1)) * chartWidth;
      const y = chartHeight - ((item.balance - yMin) / yRange) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  // Generuj ścieżkę z wypełnieniem
  const areaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Historia salda ({days} dni)</CardTitle>
          <div className="flex items-center gap-2">
            {change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={cn("text-sm font-semibold", change >= 0 ? "text-green-600" : "text-red-600")}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)} {currency} ({changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {balanceHistory.length > 1 ? (
          <div className="space-y-4">
            {/* Wykres SVG */}
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-[200px]"
              preserveAspectRatio="none"
            >
              {/* Linie siatki poziome */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartHeight * ratio;
                return (
                  <g key={ratio}>
                    <line
                      x1="0"
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-muted-foreground/20"
                      strokeDasharray="2,2"
                    />
                  </g>
                );
              })}

              {/* Wypełnienie pod wykresem */}
              <polygon
                points={areaPoints}
                fill="currentColor"
                className={cn(
                  "opacity-20",
                  change >= 0 ? "text-green-500" : "text-red-500"
                )}
              />

              {/* Linia wykresu */}
              <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={cn(change >= 0 ? "text-green-500" : "text-red-500")}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Punkty na wykresie */}
              {balanceHistory.map((item, index) => {
                const x = (index / (balanceHistory.length - 1)) * chartWidth;
                const y = chartHeight - ((item.balance - yMin) / yRange) * chartHeight;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="currentColor"
                    className={cn(change >= 0 ? "text-green-500" : "text-red-500")}
                  >
                    <title>
                      {format(item.date, "d MMM", { locale: pl })}: {item.balance.toFixed(2)} {currency}
                    </title>
                  </circle>
                );
              })}
            </svg>

            {/* Legenda osi X */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{format(balanceHistory[0].date, "d MMM", { locale: pl })}</span>
              <span>
                {format(
                  balanceHistory[Math.floor(balanceHistory.length / 2)].date,
                  "d MMM",
                  { locale: pl }
                )}
              </span>
              <span>
                {format(balanceHistory[balanceHistory.length - 1].date, "d MMM", { locale: pl })}
              </span>
            </div>

            {/* Podsumowanie */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t text-center">
              <div>
                <p className="text-xs text-muted-foreground">Początek okresu</p>
                <p className="text-sm font-semibold">
                  {startBalance.toFixed(2)} {currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktualnie</p>
                <p className="text-sm font-semibold">
                  {endBalance.toFixed(2)} {currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Zmiana</p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    change >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)} {currency}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Brak danych do wyświetlenia wykresu. Dodaj więcej transakcji.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

