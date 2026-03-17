"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Calendar,
  DollarSign,
  BarChart3,
  PieChart,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AnalyticsData {
  summary: {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    expiringSoonCount: number;
    expiredCount: number;
  };
  topCategories: Array<{
    category: string;
    count: number;
    value: number;
  }>;
  topLocations: Array<{
    location: string;
    count: number;
    value: number;
  }>;
  valuableItems: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string | null;
    price: number;
    totalValue: number;
  }>;
  insights: Array<{
    type: "warning" | "alert" | "error" | "info";
    title: string;
    message: string;
    action: string | null;
  }>;
  lowStockItems: Array<{
    id: string;
    name: string;
    quantity: number;
    minQuantity: number | null;
    unit: string | null;
  }>;
  expiringItems: Array<{
    id: string;
    name: string;
    expiryDate: Date;
    daysLeft: number;
  }>;
}

const categoryLabels: Record<string, string> = {
  dairy: "Nabiał",
  meat: "Mięso",
  vegetables: "Warzywa",
  fruits: "Owoce",
  bakery: "Pieczywo",
  pantry: "Spiżarnia",
  frozen: "Mrożonki",
  beverages: "Napoje",
  snacks: "Przekąski",
  other: "Inne",
};

const locationLabels: Record<string, string> = {
  fridge: "Lodówka",
  freezer: "Zamrażarka",
  pantry: "Spiżarnia",
  cabinet: "Szafka",
  other: "Inne",
};

const locationIcons: Record<string, string> = {
  fridge: "🧊",
  freezer: "❄️",
  pantry: "🏺",
  cabinet: "🗄️",
  other: "📦",
};

export function InventoryDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch("/api/inventory/analytics");
        if (response.ok) {
          const analytics = await response.json();
          setData(analytics);
        } else {
          setError("Nie udało się pobrać analityki");
        }
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Wystąpił błąd podczas ładowania danych");
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error || "Brak danych"}</AlertDescription>
      </Alert>
    );
  }

  const insightColors = {
    warning: "border-yellow-200 bg-yellow-50",
    alert: "border-orange-200 bg-orange-50",
    error: "border-red-200 bg-red-50",
    info: "border-blue-200 bg-blue-50",
  };

  const insightIcons = {
    warning: "text-yellow-600",
    alert: "text-orange-600",
    error: "text-red-600",
    info: "text-blue-600",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Inwentarza</h2>
        <p className="text-muted-foreground">
          Przegląd statystyk i analiza Twoich zapasów
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie Produkty</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalItems}</div>
            <p className="text-xs text-muted-foreground">pozycji w inwentarzu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Całkowita Wartość</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalValue.toFixed(2)} zł</div>
            <p className="text-xs text-muted-foreground">szacowana wartość zapasów</p>
          </CardContent>
        </Card>

        <Card className={data.summary.lowStockCount > 0 ? "border-yellow-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Niskie Zapasy</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">wymaga uzupełnienia</p>
          </CardContent>
        </Card>

        <Card className={data.summary.expiringSoonCount > 0 ? "border-orange-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wygasają Wkrótce</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.expiringSoonCount}</div>
            <p className="text-xs text-muted-foreground">w ciągu 7 dni</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Insights i Rekomendacje
            </CardTitle>
            <CardDescription>Inteligentne sugestie bazujące na analizie zapasów</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 ${insightColors[insight.type]}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${insightIcons[insight.type]}`} />
                    <div className="flex-1">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{insight.message}</p>
                      {insight.action && (
                        <Button variant="link" className="px-0 h-auto mt-2" asChild>
                          <Link href="/inventory">
                            {insight.action} <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Top Kategorie
            </CardTitle>
            <CardDescription>Najwięcej produktów według kategorii</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${(cat.count / data.summary.totalItems) * 100}%`,
                        maxWidth: "60%",
                      }}
                    />
                    <span className="text-sm font-medium">
                      {categoryLabels[cat.category] || cat.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{cat.count}</Badge>
                    <span className="text-xs text-muted-foreground">{cat.value.toFixed(0)} zł</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Lokalizacje
            </CardTitle>
            <CardDescription>Rozmieszczenie produktów</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topLocations.map((loc, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${(loc.count / data.summary.totalItems) * 100}%`,
                        maxWidth: "60%",
                      }}
                    />
                    <span className="text-sm font-medium">
                      {locationIcons[loc.location]} {locationLabels[loc.location] || loc.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{loc.count}</Badge>
                    <span className="text-xs text-muted-foreground">{loc.value.toFixed(0)} zł</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Valuable Items */}
      {data.valuableItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Najbardziej Wartościowe Produkty
            </CardTitle>
            <CardDescription>Top 10 produktów według wartości</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.valuableItems.slice(0, 10).map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">#{idx + 1}</span>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit} × {item.price.toFixed(2)} zł
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {item.totalValue.toFixed(2)} zł
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

