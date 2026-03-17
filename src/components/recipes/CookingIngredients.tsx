"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Scan, Check, Package } from "lucide-react";
import { toast } from "sonner";
import { ProductScannerDialog } from "@/components/inventory/ProductScannerDialog";

interface Ingredient {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  optional?: boolean;
}

interface CookingIngredientsProps {
  recipeId: string;
  ingredients: Ingredient[];
  onIngredientUsed?: () => void;
  className?: string;
}

export function CookingIngredients({
  recipeId,
  ingredients,
  onIngredientUsed,
  className,
}: CookingIngredientsProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [usedIngredients, setUsedIngredients] = useState<Set<string>>(new Set());
  const [scanningFor, setScanningFor] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleCheck = (ingredientId: string, checked: boolean) => {
    const newChecked = new Set(checkedIngredients);
    if (checked) {
      newChecked.add(ingredientId);
    } else {
      newChecked.delete(ingredientId);
    }
    setCheckedIngredients(newChecked);
  };

  const handleUseIngredient = async (ingredient: Ingredient, barcode?: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/use-ingredient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientName: ingredient.name,
          barcode: barcode || null,
          quantity: ingredient.quantity || 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error === "Product not found in inventory") {
          toast.error(`${ingredient.name} nie znajduje się w inwentarzu`);
        } else if (error.error === "Not enough quantity in inventory") {
          toast.error(
            `Za mało ${ingredient.name} w inwentarzu (dostępne: ${error.available}${ingredient.unit || ""})`
          );
        } else {
          toast.error("Nie udało się użyć składnika");
        }
        return;
      }

      const data = await response.json();

      // Oznacz jako użyty
      const newUsed = new Set(usedIngredients);
      newUsed.add(ingredient.id);
      setUsedIngredients(newUsed);

      // Oznacz jako sprawdzony
      const newChecked = new Set(checkedIngredients);
      newChecked.add(ingredient.id);
      setCheckedIngredients(newChecked);

      toast.success(
        `Użyto ${data.inventoryItem.quantityUsed} ${data.inventoryItem.unit || ""} - ${data.inventoryItem.name}`,
        {
          description: `Pozostało: ${data.inventoryItem.newQuantity} ${data.inventoryItem.unit || ""}`,
        }
      );

      if (onIngredientUsed) {
        onIngredientUsed();
      }
    } catch (error) {
      console.error("Error using ingredient:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleScanForIngredient = (ingredient: Ingredient) => {
    setScanningFor(ingredient.id);
    setShowScanner(true);
  };

  const handleScanComplete = async (barcode: string) => {
    setShowScanner(false);

    if (!scanningFor) return;

    const ingredient = ingredients.find((i) => i.id === scanningFor);
    if (!ingredient) return;

    await handleUseIngredient(ingredient, barcode);
    setScanningFor(null);
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Składniki
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.map((ingredient) => {
            const isChecked = checkedIngredients.has(ingredient.id);
            const isUsed = usedIngredients.has(ingredient.id);

            return (
              <div
                key={ingredient.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  isUsed
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                    : "bg-background"
                }`}
              >
                {/* Checkbox */}
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => handleCheck(ingredient.id, checked as boolean)}
                  className="mt-1"
                />

                {/* Nazwa i ilość */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                      {ingredient.quantity && ingredient.unit
                        ? `${ingredient.quantity} ${ingredient.unit}`
                        : ingredient.quantity
                        ? `${ingredient.quantity}`
                        : ""}{" "}
                      {ingredient.name}
                    </span>
                    {ingredient.optional && (
                      <Badge variant="outline" className="text-xs">
                        Opcjonalnie
                      </Badge>
                    )}
                    {isUsed && (
                      <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                        <Check className="h-3 w-3 mr-1" />
                        Użyto z inwentarza
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Akcje */}
                {!isUsed && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleScanForIngredient(ingredient)}
                      title="Zeskanuj produkt"
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUseIngredient(ingredient)}
                      title="Mam w inwentarzu"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Progress */}
          <div className="pt-3 border-t">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Postęp:</span>
              <span className="font-medium">
                {checkedIngredients.size} / {ingredients.length}
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${(checkedIngredients.size / ingredients.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Dialog */}
      <ProductScannerDialog
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={handleScanComplete}
      />
    </>
  );
}

