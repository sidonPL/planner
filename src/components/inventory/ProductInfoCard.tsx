"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { CircleAlert, Award, Factory } from "lucide-react";

interface NutritionData {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  salt?: number;
  sugar?: number;
}

interface ProductData {
  barcode: string;
  name: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  quantity?: string;
  imageUrl?: string;
  nutrition?: NutritionData;
  allergens?: string[];
  labels?: string[];
  nutriScore?: string;
  novaGroup?: number;
  ecoScore?: string;
  source: string;
}

interface ProductInfoCardProps {
  product: ProductData;
  className?: string;
}

export function ProductInfoCard({ product, className }: ProductInfoCardProps) {
  const hasNutrition = product.nutrition && Object.values(product.nutrition).some((v) => v != null);

  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-4">
        {/* Header z obrazkiem */}
        <div className="flex gap-4">
          {product.imageUrl && (
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold leading-tight">{product.name}</h3>
            {product.brand && (
              <p className="mt-1 text-sm text-muted-foreground">{product.brand}</p>
            )}
            {product.quantity && (
              <p className="mt-0.5 text-xs text-muted-foreground">{product.quantity}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Kod: {product.barcode}
            </p>
          </div>
        </div>

        {/* Scores */}
        {(product.nutriScore || product.novaGroup || product.ecoScore) && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {product.nutriScore && (
                <Badge
                  variant="outline"
                  className={`font-semibold ${getNutriScoreColor(product.nutriScore)}`}
                >
                  Nutri-Score: {product.nutriScore}
                </Badge>
              )}
              {product.novaGroup && (
                <Badge variant="outline">
                  NOVA: {product.novaGroup}
                </Badge>
              )}
              {product.ecoScore && (
                <Badge
                  variant="outline"
                  className={`font-semibold ${getEcoScoreColor(product.ecoScore)}`}
                >
                  Eco-Score: {product.ecoScore}
                </Badge>
              )}
            </div>
          </>
        )}

        {/* Etykiety */}
        {product.labels && product.labels.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Etykiety:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {product.labels.slice(0, 6).map((label, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {formatLabel(label)}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Alergeny */}
        {product.allergens && product.allergens.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CircleAlert className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Alergeny:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {product.allergens.map((allergen, idx) => (
                  <Badge key={idx} variant="destructive" className="text-xs">
                    {formatLabel(allergen)}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Wartości odżywcze */}
        {hasNutrition && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Wartości odżywcze (na 100g/100ml)</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {product.nutrition?.calories != null && (
                  <NutritionItem label="Kalorie" value={`${product.nutrition.calories} kcal`} />
                )}
                {product.nutrition?.protein != null && (
                  <NutritionItem label="Białko" value={`${product.nutrition.protein.toFixed(1)} g`} />
                )}
                {product.nutrition?.carbohydrates != null && (
                  <NutritionItem label="Węglowodany" value={`${product.nutrition.carbohydrates.toFixed(1)} g`} />
                )}
                {product.nutrition?.fat != null && (
                  <NutritionItem label="Tłuszcze" value={`${product.nutrition.fat.toFixed(1)} g`} />
                )}
                {product.nutrition?.fiber != null && (
                  <NutritionItem label="Błonnik" value={`${product.nutrition.fiber.toFixed(1)} g`} />
                )}
                {product.nutrition?.sugar != null && (
                  <NutritionItem label="Cukry" value={`${product.nutrition.sugar.toFixed(1)} g`} />
                )}
                {product.nutrition?.salt != null && (
                  <NutritionItem label="Sól" value={`${product.nutrition.salt.toFixed(2)} g`} />
                )}
              </div>
            </div>
          </>
        )}

        {/* Źródło danych */}
        <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          <Factory className="h-3 w-3" />
          <span>Dane z: {getSourceName(product.source)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function NutritionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 px-2 rounded-md bg-muted/50">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function getNutriScoreColor(score: string): string {
  const colors: Record<string, string> = {
    A: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300",
    B: "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-950 dark:text-lime-300",
    C: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300",
    D: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300",
    E: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300",
  };
  return colors[score] || "";
}

function getEcoScoreColor(score: string): string {
  const colors: Record<string, string> = {
    A: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300",
    B: "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-950 dark:text-lime-300",
    C: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300",
    D: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300",
    E: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300",
  };
  return colors[score] || "";
}

function formatLabel(label: string): string {
  // Zamień podkreślenia i myślniki na spacje i kapitalizuj
  return label
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getSourceName(source: string): string {
  const names: Record<string, string> = {
    openfoodfacts: "Open Food Facts",
    usda: "USDA",
    manual: "Wprowadzono ręcznie",
  };
  return names[source] || source;
}

