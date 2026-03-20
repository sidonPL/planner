"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, ChefHat, Package, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface UsageStatsProps {
  days?: number;
  className?: string;
}

type UsageStatsData = {
  summary: {
    totalUsages: number;
    uniqueRecipes: number;
    uniqueIngredients: number;
  };
  popularRecipes: Array<{
    recipeId: string;
    recipeName: string;
    recipeImage: string | null;
    count: number;
    lastUsed: string | Date;
  }>;
  popularIngredients: Array<{
    name: string;
    count: number;
    totalQuantity: number;
    unit: string;
  }>;
  recentHistory: Array<{
    id: string;
    quantity: number;
    unit: string;
    ingredient: string;
    timestamp: string | Date;
    recipe: { name: string };
    user: { name: string | null; avatar?: string | null };
  }>;
};

export function RecipeUsageStats({ days = 30, className }: UsageStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStatsData | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recipes/usage-stats?days=${days}`);
      if (response.ok) {
        const data = await response.json() as UsageStatsData;
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching usage stats:", error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.summary.totalUsages === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Historia Użycia</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <ChefHat className="h-16 w-16 mx-auto opacity-50 mb-4" />
          <p>Brak danych. Zacznij gotować używając funkcji skanowania!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Podsumowanie */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Użyć</p>
              <p className="text-2xl font-bold">{stats.summary.totalUsages}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-muted-foreground">Przepisów</p>
              <p className="text-2xl font-bold">{stats.summary.uniqueRecipes}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Składników</p>
              <p className="text-2xl font-bold">{stats.summary.uniqueIngredients}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Najpopularniejsze przepisy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Najpopularniejsze Przepisy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.popularRecipes.map((recipe, idx: number) => (
              <Link
                key={recipe.recipeId}
                href={`/recipes/${recipe.recipeId}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                  {idx + 1}
                </Badge>

                {recipe.recipeImage ? (
                  <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={recipe.recipeImage}
                      alt={recipe.recipeName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <ChefHat className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{recipe.recipeName}</p>
                  <p className="text-xs text-muted-foreground">
                    Użyto {recipe.count}× • Ostatnio:{" "}
                    {format(new Date(recipe.lastUsed), "d MMM", { locale: pl })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Najpopularniejsze składniki */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Najpopularniejsze Składniki
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.popularIngredients.map((ingredient, idx: number) => (
              <div
                key={ingredient.name}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{idx + 1}</Badge>
                  <span className="font-medium">{ingredient.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {ingredient.count}× • {ingredient.totalQuantity.toFixed(1)} {ingredient.unit}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ostatnie użycie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ostatnie Użycie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentHistory.map((history) => (
              <div key={history.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={history.user.avatar || undefined} />
                  <AvatarFallback>{history.user.name?.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{history.user.name}</span> użył{" "}
                    <span className="font-medium">
                      {history.quantity} {history.unit}
                    </span>{" "}
                    <span className="text-muted-foreground">{history.ingredient}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {history.recipe.name} •{" "}
                    {format(new Date(history.timestamp), "d MMM, HH:mm", { locale: pl })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

