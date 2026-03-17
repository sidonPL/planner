"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2, TrendingDown, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RecipeCostProps {
  recipeId: string;
  className?: string;
}

export function RecipeCost({ recipeId, className }: RecipeCostProps) {
  const [loading, setLoading] = useState(true);
  const [cost, setCost] = useState<any>(null);

  useEffect(() => {
    fetchCost();
  }, [recipeId]);

  const fetchCost = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/cost`);
      if (response.ok) {
        const data = await response.json();
        setCost(data);
      }
    } catch (error) {
      console.error("Error fetching recipe cost:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!cost) {
    return null;
  }

  const completenessColor =
    cost.completeness >= 80
      ? "text-green-600"
      : cost.completeness >= 50
      ? "text-yellow-600"
      : "text-orange-600";

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            Koszt Przepisu
          </CardTitle>
          {cost.hasAllPrices ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Kompletne
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              Szacunkowe
            </Badge>
          )}
        </div>

        {/* Progress bar kompletności */}
        {!cost.hasAllPrices && (
          <div className="flex items-center gap-2 mt-2">
            <Progress value={cost.completeness} className="h-2 flex-1" />
            <span className={`text-xs font-medium ${completenessColor}`}>
              {cost.completeness}%
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Główny koszt */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div>
              <p className="text-sm text-muted-foreground">Koszt całkowity</p>
              <p className="text-3xl font-bold text-primary">
                {cost.totalCost.toFixed(2)} zł
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Na porcję</p>
              <p className="text-xl font-semibold">
                {cost.costPerServing.toFixed(2)} zł
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            Dla {cost.servings} porcji
          </div>
        </div>

        {/* Lista składników z cenami */}
        <div>
          <p className="text-sm font-medium mb-2">Breakdown składników:</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {cost.ingredients.map((ingredient: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-md text-sm ${
                  ingredient.pricePerUnit
                    ? "bg-muted/50"
                    : "bg-orange-50 dark:bg-orange-950/20"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ingredient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ingredient.quantity} {ingredient.unit}
                    {ingredient.pricePerUnit && (
                      <span> × {ingredient.pricePerUnit.toFixed(2)} zł</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  {ingredient.totalCost !== null ? (
                    <span className="font-semibold">
                      {ingredient.totalCost.toFixed(2)} zł
                    </span>
                  ) : (
                    <span className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Brak ceny
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info o niekompletnych danych */}
        {!cost.hasAllPrices && (
          <div className="text-xs text-muted-foreground p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200">
            <p className="flex items-center gap-1 font-medium text-orange-700">
              <AlertCircle className="h-3 w-3" />
              Niekompletne dane
            </p>
            <p className="mt-1">
              Dodaj ceny do produktów w inwentarzu aby zobaczyć dokładny koszt przepisu.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

