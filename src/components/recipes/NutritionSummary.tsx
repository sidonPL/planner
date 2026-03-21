"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChefHat, Users, TrendingUp, Info } from "lucide-react";
import { calculateRecipeNutrition, getNutriScoreColor } from "@/lib/nutrition-calculator";

interface NutritionData {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  salt?: number;
  sugar?: number;
  saturatedFat?: number;
}

interface Ingredient {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  nutrition?: NutritionData | null;
}

interface NutritionSummaryProps {
  ingredients: Ingredient[];
  servings: number;
  className?: string;
}

export function NutritionSummary({ ingredients, servings, className }: NutritionSummaryProps) {
  const nutrition = calculateRecipeNutrition(ingredients, servings);

  if (nutrition.ingredientsWithNutrition === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ChefHat className="h-5 w-5" />
            Wartości odżywcze
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            Dodaj zeskanowane produkty z inwentarza aby zobaczyć wartości odżywcze
          </p>
        </CardContent>
      </Card>
    );
  }

  const { perServing } = nutrition;
  const completenessColor =
    nutrition.completeness >= 80
      ? "text-green-600"
      : nutrition.completeness >= 50
      ? "text-yellow-600"
      : "text-orange-600";

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ChefHat className="h-5 w-5" />
            Wartości odżywcze
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {servings} porcji
            </Badge>
            {nutrition.nutriScore && (
              <Badge className={getNutriScoreColor(nutrition.nutriScore)}>
                Nutri-Score: {nutrition.nutriScore}
              </Badge>
            )}
          </div>
        </div>

        {/* Kompletność danych */}
        <div className="flex items-center gap-2 mt-2">
          <Progress value={nutrition.completeness} className="h-2 flex-1" />
          <span className={`text-xs font-medium ${completenessColor} flex items-center gap-1`} title={`${nutrition.ingredientsWithNutrition} z ${nutrition.totalIngredients} składników ma wartości odżywcze`}>
            {nutrition.completeness}%
            <Info className="h-3 w-3" />
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Na porcję */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Na 1 porcję</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NutritionItem
              label="Kalorie"
              value={perServing.calories || 0}
              unit="kcal"
              color="text-orange-600"
            />
            <NutritionItem
              label="Białko"
              value={perServing.protein || 0}
              unit="g"
              color="text-red-600"
            />
            <NutritionItem
              label="Węglowodany"
              value={perServing.carbohydrates || 0}
              unit="g"
              color="text-yellow-600"
            />
            <NutritionItem
              label="Tłuszcze"
              value={perServing.fat || 0}
              unit="g"
              color="text-purple-600"
            />
            {perServing.fiber! > 0 && (
              <NutritionItem
                label="Błonnik"
                value={perServing.fiber || 0}
                unit="g"
                color="text-green-600"
              />
            )}
            {perServing.sugar! > 0 && (
              <NutritionItem
                label="Cukry"
                value={perServing.sugar || 0}
                unit="g"
                color="text-pink-600"
              />
            )}
            {perServing.salt! > 0 && (
              <NutritionItem
                label="Sól"
                value={perServing.salt || 0}
                unit="g"
                color="text-gray-600"
              />
            )}
          </div>
        </div>

        {/* Całość */}
        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Całość ({servings} porcji):</span>
              <span className="font-medium">{Math.round(nutrition.total.calories || 0)} kcal</span>
            </div>
            <div className="flex justify-between">
              <span>Białko:</span>
              <span className="font-medium">{(nutrition.total.protein || 0).toFixed(1)}g</span>
            </div>
            <div className="flex justify-between">
              <span>Węglowodany:</span>
              <span className="font-medium">{(nutrition.total.carbohydrates || 0).toFixed(1)}g</span>
            </div>
            <div className="flex justify-between">
              <span>Tłuszcze:</span>
              <span className="font-medium">{(nutrition.total.fat || 0).toFixed(1)}g</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        {nutrition.completeness < 100 && (
          <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
            Wartości szacunkowe - część składników nie ma danych odżywczych
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NutritionItem({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>
        {value.toFixed(value >= 10 ? 0 : 2)} {unit}
      </span>
    </div>
  );
}

