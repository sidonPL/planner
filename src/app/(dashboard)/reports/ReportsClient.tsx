"use client";

import { format, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Wallet,
  Plane,
  Trophy,
  Calendar,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TaskStats {
  thisWeek: { total: number; completed: number };
  prevWeek: { total: number; completed: number };
  thisMonth: { total: number; completed: number };
  prevMonth: { total: number; completed: number };
}

interface BudgetStats {
  thisWeek: number;
  prevWeek: number;
  thisMonth: number;
  prevMonth: number;
  incomeThisMonth: number;
  incomePrevMonth: number;
  byCategory: { category: string; amount: number }[];
}

interface MealStats {
  thisWeek: number;
  prevWeek: number;
}

interface ShoppingStats {
  completed: number;
  pending: number;
}

interface Trip {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  destination: string | null;
}

interface UserRanking {
  userId: string;
  name: string;
  color: string;
  avatar: string | null;
  tasksCompleted: number;
}

interface ReportsClientProps {
  taskStats: TaskStats;
  budgetStats: BudgetStats;
  mealStats: MealStats;
  shoppingStats: ShoppingStats;
  upcomingTrips: Trip[];
  userRanking: UserRanking[];
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return current > 0 ? (
      <span className="text-green-600 flex items-center gap-1 text-sm">
        <TrendingUp className="h-4 w-4" />
        Nowy
      </span>
    ) : null;
  }

  const change = ((current - previous) / previous) * 100;

  if (Math.abs(change) < 1) {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-sm">
        <Minus className="h-4 w-4" />
        Bez zmian
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="text-green-600 flex items-center gap-1 text-sm">
        <TrendingUp className="h-4 w-4" />
        +{change.toFixed(0)}%
      </span>
    );
  }

  return (
    <span className="text-red-600 flex items-center gap-1 text-sm">
      <TrendingDown className="h-4 w-4" />
      {change.toFixed(0)}%
    </span>
  );
}

function ExpenseTrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return current > 0 ? (
      <span className="text-red-600 flex items-center gap-1 text-sm">
        <TrendingUp className="h-4 w-4" />
        Nowe wydatki
      </span>
    ) : null;
  }

  const change = ((current - previous) / previous) * 100;

  if (Math.abs(change) < 1) {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-sm">
        <Minus className="h-4 w-4" />
        Bez zmian
      </span>
    );
  }

  // Dla wydatków - mniej = lepiej
  if (change > 0) {
    return (
      <span className="text-red-600 flex items-center gap-1 text-sm">
        <TrendingUp className="h-4 w-4" />
        +{change.toFixed(0)}%
      </span>
    );
  }

  return (
    <span className="text-green-600 flex items-center gap-1 text-sm">
      <TrendingDown className="h-4 w-4" />
      {change.toFixed(0)}%
    </span>
  );
}

const categoryLabels: Record<string, string> = {
  FOOD: "Jedzenie",
  TRANSPORT: "Transport",
  BILLS: "Rachunki",
  ENTERTAINMENT: "Rozrywka",
  HEALTH: "Zdrowie",
  SHOPPING: "Zakupy",
  HOME: "Dom",
  OTHER: "Inne",
};

export function ReportsClient({
  taskStats,
  budgetStats,
  mealStats,
  shoppingStats,
  upcomingTrips,
  userRanking,
}: ReportsClientProps) {
  const weeklyTaskCompletion =
    taskStats.thisWeek.total > 0
      ? Math.round((taskStats.thisWeek.completed / taskStats.thisWeek.total) * 100)
      : 0;

  const monthlyTaskCompletion =
    taskStats.thisMonth.total > 0
      ? Math.round((taskStats.thisMonth.completed / taskStats.thisMonth.total) * 100)
      : 0;

  const monthlyBalance = budgetStats.incomeThisMonth - budgetStats.thisMonth;

  const maxCategoryAmount = Math.max(...budgetStats.byCategory.map((c) => c.amount), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Raporty i statystyki
          </h1>
          <p className="text-muted-foreground">
            Podsumowanie aktywności gospodarstwa domowego
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly">Tygodniowe</TabsTrigger>
          <TabsTrigger value="monthly">Miesięczne</TabsTrigger>
        </TabsList>

        {/* Raport tygodniowy */}
        <TabsContent value="weekly" className="space-y-6">
          {/* Podsumowanie kart */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Zadania */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Zadania w tym tygodniu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {taskStats.thisWeek.completed}/{taskStats.thisWeek.total}
                    </p>
                    <p className="text-xs text-muted-foreground">ukończonych</p>
                  </div>
                  <TrendIndicator
                    current={taskStats.thisWeek.completed}
                    previous={taskStats.prevWeek.completed}
                  />
                </div>
                <Progress value={weeklyTaskCompletion} className="mt-2" />
              </CardContent>
            </Card>

            {/* Wydatki */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wydatki w tym tygodniu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {budgetStats.thisWeek.toFixed(0)} zł
                    </p>
                    <p className="text-xs text-muted-foreground">wydane</p>
                  </div>
                  <ExpenseTrendIndicator
                    current={budgetStats.thisWeek}
                    previous={budgetStats.prevWeek}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Posiłki */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Zaplanowane posiłki
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{mealStats.thisWeek}</p>
                    <p className="text-xs text-muted-foreground">w tym tygodniu</p>
                  </div>
                  <TrendIndicator
                    current={mealStats.thisWeek}
                    previous={mealStats.prevWeek}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Zakupy */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lista zakupów
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{shoppingStats.pending}</p>
                    <p className="text-xs text-muted-foreground">do kupienia</p>
                  </div>
                  <Badge variant={shoppingStats.pending > 10 ? "destructive" : "secondary"}>
                    {shoppingStats.completed} kupionych
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Raport miesięczny */}
        <TabsContent value="monthly" className="space-y-6">
          {/* Podsumowanie kart */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Zadania */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Zadania w tym miesiącu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {taskStats.thisMonth.completed}/{taskStats.thisMonth.total}
                    </p>
                    <p className="text-xs text-muted-foreground">ukończonych</p>
                  </div>
                  <TrendIndicator
                    current={taskStats.thisMonth.completed}
                    previous={taskStats.prevMonth.completed}
                  />
                </div>
                <Progress value={monthlyTaskCompletion} className="mt-2" />
              </CardContent>
            </Card>

            {/* Wydatki */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wydatki w tym miesiącu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {budgetStats.thisMonth.toFixed(0)} zł
                    </p>
                    <p className="text-xs text-muted-foreground">wydane</p>
                  </div>
                  <ExpenseTrendIndicator
                    current={budgetStats.thisMonth}
                    previous={budgetStats.prevMonth}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Przychody */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Przychody w tym miesiącu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {budgetStats.incomeThisMonth.toFixed(0)} zł
                    </p>
                    <p className="text-xs text-muted-foreground">przychodów</p>
                  </div>
                  <TrendIndicator
                    current={budgetStats.incomeThisMonth}
                    previous={budgetStats.incomePrevMonth}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bilans */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bilans miesiąca
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-2xl font-bold ${
                        monthlyBalance >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {monthlyBalance >= 0 ? "+" : ""}
                      {monthlyBalance.toFixed(0)} zł
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {monthlyBalance >= 0 ? "oszczędności" : "strata"}
                    </p>
                  </div>
                  <Wallet
                    className={`h-8 w-8 ${
                      monthlyBalance >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wydatki per kategoria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wydatki według kategorii
              </CardTitle>
              <CardDescription>Rozkład wydatków w bieżącym miesiącu</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetStats.byCategory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Brak wydatków w tym miesiącu
                </p>
              ) : (
                <div className="space-y-3">
                  {budgetStats.byCategory.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{categoryLabels[cat.category] || cat.category}</span>
                        <span className="font-medium">{cat.amount.toFixed(0)} zł</span>
                      </div>
                      <Progress
                        value={(cat.amount / maxCategoryAmount) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dolne sekcje - wspólne */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ranking domowników */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking produktywności
            </CardTitle>
            <CardDescription>Ukończone zadania w tym miesiącu</CardDescription>
          </CardHeader>
          <CardContent>
            {userRanking.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Brak ukończonych zadań w tym miesiącu
              </p>
            ) : (
              <div className="space-y-3">
                {userRanking.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                          ? "bg-gray-100 text-gray-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback style={{ backgroundColor: user.color }}>
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium">{user.name}</span>
                    <Badge variant="secondary">{user.tasksCompleted} zadań</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nadchodzące wyjazdy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-blue-500" />
              Nadchodzące wyjazdy
            </CardTitle>
            <CardDescription>Zaplanowane wycieczki</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTrips.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">Brak zaplanowanych wyjazdów</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/trips">
                    Zaplanuj wyjazd
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTrips.map((trip) => {
                  const daysUntil = differenceInDays(new Date(trip.startDate), new Date());
                  return (
                    <Link
                      key={trip.id}
                      href={`/trips/${trip.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{trip.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(trip.startDate), "d MMM", { locale: pl })} -{" "}
                          {format(new Date(trip.endDate), "d MMM yyyy", { locale: pl })}
                        </p>
                      </div>
                      <Badge
                        variant={daysUntil <= 7 ? "default" : "secondary"}
                      >
                        {daysUntil === 0
                          ? "Dziś!"
                          : daysUntil === 1
                          ? "Jutro"
                          : `za ${daysUntil} dni`}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

