"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Users } from "lucide-react";
import { toast } from "sonner";

interface StatsData {
  xpHistory: Array<{ date: string; xp: number; cumulativeXP: number }>;
  achievementsByCategory: Array<{ category: string; count: number }>;
  topTasks: Array<{ title: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
  householdComparison: {
    yourXP: number;
    yourLevel: number;
    householdAvgXP: number;
    householdAvgLevel: number;
    totalMembers: number;
  };
  recentActivity: Array<{
    type: string;
    title: string;
    date: Date;
    xp: number;
    icon?: string;
  }>;
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const categoryLabels: Record<string, string> = {
  TASKS: "Zadania",
  RECIPES: "Przepisy",
  MEALS: "Posiłki",
  SHOPPING: "Zakupy",
  INVENTORY: "Inwentarz",
  STREAK: "Serie",
  SOCIAL: "Współpraca",
  MASTER: "Mistrzostwa",
};

export function StatsDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gamification/stats?days=${days}`);
      if (!res.ok) {
        console.error("Failed to fetch stats");
        return;
      }

      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Nie udało się pobrać statystyk");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Brak danych statystyk</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Statystyki</h2>
        <Tabs value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <TabsList>
            <TabsTrigger value="7">7 dni</TabsTrigger>
            <TabsTrigger value="30">30 dni</TabsTrigger>
            <TabsTrigger value="90">90 dni</TabsTrigger>
            <TabsTrigger value="365">Rok</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* XP Over Time */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              XP przez czas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.xpHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) => new Date(date as string).toLocaleDateString("pl-PL")}
                  formatter={(value: number | undefined) => [`${value || 0} XP`, "Zdobyte XP"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="xp"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Dzienne XP"
                  dot={{ fill: "#f59e0b" }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeXP"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Łączne XP"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Achievements by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Osiągnięcia według kategorii
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.achievementsByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => {
                    const data = entry as unknown as { category: string; count: number };
                    return `${categoryLabels[data.category] || data.category}: ${data.count}`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.achievementsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined, _name: string | undefined, props?: { payload?: { category: string } }) => [value || 0, categoryLabels[props?.payload?.category || ""] || props?.payload?.category || ""]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Najczęściej wykonywane zadania
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topTasks} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="title"
                  type="category"
                  width={150}
                  tickFormatter={(title) => title.length > 20 ? title.substring(0, 20) + "..." : title}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Activity Heatmap */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Aktywność dzienna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.dailyActivity.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString("pl-PL")}
                  formatter={(value: number | undefined) => [`${value || 0} aktywności`, "Liczba"]}
                />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Household Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Porównanie z gospodarstwem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* XP Comparison */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Twoje XP</span>
                  <span className="text-lg font-bold">{stats.householdComparison.yourXP.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Średnia gospodarstwa</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.householdComparison.householdAvgXP.toLocaleString()}
                  </span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (stats.householdComparison.yourXP / stats.householdComparison.householdAvgXP) * 50,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.householdComparison.yourXP > stats.householdComparison.householdAvgXP
                    ? `+${Math.round(((stats.householdComparison.yourXP / stats.householdComparison.householdAvgXP - 1) * 100))}% powyżej średniej`
                    : `${Math.round(((1 - stats.householdComparison.yourXP / stats.householdComparison.householdAvgXP) * 100))}% poniżej średniej`}
                </p>
              </div>

              {/* Level Comparison */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Twój poziom</span>
                  <span className="text-lg font-bold">{stats.householdComparison.yourLevel}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Średnia gospodarstwa</span>
                  <span className="text-sm text-muted-foreground">{stats.householdComparison.householdAvgLevel}</span>
                </div>
              </div>

              {/* Total Members */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  {stats.householdComparison.totalMembers} członków w gospodarstwie
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Ostatnia aktywność
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {activity.icon || (activity.type === "task" ? "✓" : activity.type === "achievement" ? "🏆" : "📖")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-primary">+{activity.xp} XP</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

