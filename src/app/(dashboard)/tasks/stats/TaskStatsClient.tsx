// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\(dashboard)\tasks\stats\TaskStatsClient.tsx
"use client";

import { format } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import {
  ArrowLeft,
  CheckSquare,
  Clock,
  Trophy,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TaskStatsClientProps {
  stats: {
    todayCompleted: number;
    weekCompleted: number;
    monthCompleted: number;
    lastMonthCompleted: number;
    pendingTasks: number;
    overdueTasks: number;
    overallOnTimePercentage: number;
    totalCompleted: number;
    avgCompletionTimeHours: number;
  };
  userStats: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
    completedCount: number;
    onTimeCount: number;
    onTimePercentage: number;
  }[];
  dailyStats: { date: string; count: number }[];
}

export function TaskStatsClient({ stats, userStats, dailyStats }: TaskStatsClientProps) {
  const monthChange = stats.lastMonthCompleted > 0
    ? Math.round(((stats.monthCompleted - stats.lastMonthCompleted) / stats.lastMonthCompleted) * 100)
    : stats.monthCompleted > 0
    ? 100
    : 0;

  const maxDailyCount = Math.max(...dailyStats.map((d) => d.count), 1);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Statystyki zadań</h1>
            <p className="text-muted-foreground">
              Analiza produktywności i postępu
            </p>
          </div>
        </div>
      </div>

      {/* Główne karty statystyk */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dzisiaj</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCompleted}</div>
            <p className="text-xs text-muted-foreground">
              ukończonych zadań
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ten tydzień</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekCompleted}</div>
            <p className="text-xs text-muted-foreground">
              ukończonych zadań
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ten miesiąc</CardTitle>
            {monthChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {monthChange >= 0 ? "+" : ""}{monthChange}% vs poprzedni miesiąc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminowość</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overallOnTimePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              zadań wykonanych na czas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dodatkowe statystyki */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Śr. czas wykonania</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgCompletionTimeHours < 24
                ? `${stats.avgCompletionTimeHours}h`
                : `${Math.round(stats.avgCompletionTimeHours / 24)}d`}
            </div>
            <p className="text-xs text-muted-foreground">
              od utworzenia do ukończenia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Łącznie ukończone</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
            <p className="text-xs text-muted-foreground">
              wszystkich zadań
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Do wykonania</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.overdueTasks > 0 && "text-red-500")}>
              {stats.pendingTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueTasks > 0 ? `w tym ${stats.overdueTasks} przeterminowanych` : "aktywnych zadań"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wykres i ranking */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wykres aktywności */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Aktywność (ostatnie 30 dni)
            </CardTitle>
            <CardDescription>Liczba ukończonych zadań dziennie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {dailyStats.map((day, index) => {
                const height = (day.count / maxDailyCount) * 100;
                const date = new Date(day.date);
                const isToday = index === dailyStats.length - 1;

                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${format(date, "d MMM", { locale: pl })}: ${day.count} zadań`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        isToday ? "bg-primary" : "bg-primary/50",
                        day.count === 0 && "bg-muted"
                      )}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{format(new Date(dailyStats[0]?.date || new Date()), "d MMM", { locale: pl })}</span>
              <span>Dziś</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking domowników */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking domowników (ten miesiąc)
          </CardTitle>
          <CardDescription>Kto ukończył najwięcej zadań w tym miesiącu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userStats.map((user, index) => (
              <div key={user.id} className="flex items-center gap-4">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                  index === 0 && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                  index === 1 && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                  index === 2 && "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                  index > 2 && "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </div>

                <Avatar className="h-10 w-10 border-2" style={{ borderColor: user.color }}>
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback style={{ backgroundColor: user.color, color: "white" }}>
                    {user.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{user.name || "Nieznany"}</span>
                    <span className="font-bold">{user.completedCount} zadań</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={user.onTimePercentage} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {user.onTimePercentage}% na czas
                    </span>
                  </div>
                </div>

                {index === 0 && user.completedCount > 0 && (
                  <Badge variant="default" className="bg-yellow-500">
                    🏆 Lider
                  </Badge>
                )}
              </div>
            ))}

            {userStats.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Brak danych o ukończonych zadaniach
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

