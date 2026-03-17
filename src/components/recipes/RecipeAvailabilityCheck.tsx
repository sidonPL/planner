"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  X,
  AlertTriangle,
  ChefHat,
  ShoppingCart,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RecipeAvailability } from "@/lib/recipe-availability";

interface RecipeAvailabilityCheckProps {
  recipeId: string;
  recipeName: string;
  servings?: number;
  variant?: "badge" | "button" | "detailed";
  className?: string;
}

export function RecipeAvailabilityCheck({
  recipeId,
  recipeName,
  servings,
  variant = "badge",
  className,
}: RecipeAvailabilityCheckProps) {
  const [availability, setAvailability] = useState<RecipeAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingToShopping, setAddingToShopping] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const params = servings ? `?servings=${servings}` : "";
      const response = await fetch(`/api/recipes/${recipeId}/check-availability${params}`);

      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      } else {
        toast.error("Nie udało się sprawdzić dostępności składników");
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void fetchAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipeId, servings]);

  const handleAddMissingToShopping = async () => {
    setAddingToShopping(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/add-missing-to-shopping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servings }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `Dodano ${data.added} składnik(ów) do listy zakupów`);
        setOpen(false);
      } else {
        toast.error("Nie udało się dodać składników");
      }
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setAddingToShopping(false);
    }
  };

  const getStatusBadge = () => {
    if (!availability) return null;

    const { availabilityPercentage, canCook, canCookWithoutOptional } = availability;

    if (canCook) {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <Check className="h-3 w-3 mr-1" />
          Gotowe do gotowania
        </Badge>
      );
    }

    if (canCookWithoutOptional) {
      return (
        <Badge variant="default" className="bg-yellow-600 hover:bg-yellow-700">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Brak składników opcjonalnych
        </Badge>
      );
    }

    if (availabilityPercentage >= 50) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Brak niektórych składników
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <X className="h-3 w-3 mr-1" />
        Brak większości składników
      </Badge>
    );
  };

  const renderTrigger = () => {
    if (variant === "badge") {
      return (
        <button className={cn("inline-flex", className)}>
          {loading ? (
            <Badge variant="secondary">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Sprawdzanie...
            </Badge>
          ) : availability ? (
            getStatusBadge()
          ) : (
            <Badge variant="outline">
              <Package className="h-3 w-3 mr-1" />
              Sprawdź dostępność
            </Badge>
          )}
        </button>
      );
    }

    if (variant === "button") {
      return (
        <Button variant="outline" className={className} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sprawdzanie...
            </>
          ) : (
            <>
              <Package className="h-4 w-4 mr-2" />
              Sprawdź dostępność składników
            </>
          )}
        </Button>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Dostępność składników: {recipeName}
          </DialogTitle>
          <DialogDescription>
            {servings && `Dla ${servings} porcji`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : availability ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dostępność składników</span>
                <span className="font-medium">{availability.availabilityPercentage}%</span>
              </div>
              <Progress value={availability.availabilityPercentage} className="h-2" />
            </div>

            {/* Statystyki */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {availability.availableIngredients}
                </div>
                <div className="text-xs text-muted-foreground">Dostępne</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {availability.missingIngredients}
                </div>
                <div className="text-xs text-muted-foreground">Brakujące</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {availability.partiallyAvailableIngredients}
                </div>
                <div className="text-xs text-muted-foreground">Częściowe</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {availability.optionalMissingIngredients}
                </div>
                <div className="text-xs text-muted-foreground">Opcjonalne</div>
              </div>
            </div>

            <Separator />

            {/* Lista składników */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {availability.ingredients.map((ingredient) => (
                  <div
                    key={ingredient.ingredientId}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      ingredient.available
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                        : ingredient.optional
                        ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20"
                        : "bg-red-50 border-red-200 dark:bg-red-950/20"
                    )}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {ingredient.available ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : ingredient.percentageAvailable && ingredient.percentageAvailable > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </div>

                    {/* Informacje */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ingredient.ingredientName}</span>
                        {ingredient.optional && (
                          <Badge variant="outline" className="text-xs">
                            Opcjonalny
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground mt-1">
                        Potrzeba: {ingredient.quantityNeeded} {ingredient.unit || "szt"}
                      </div>

                      {ingredient.inventoryMatch && (
                        <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                          W inwentarzu: {ingredient.inventoryMatch.quantityAvailable}{" "}
                          {ingredient.inventoryMatch.unit || "szt"}
                          {ingredient.inventoryMatch.brand && (
                            <span className="text-muted-foreground ml-1">
                              ({ingredient.inventoryMatch.brand})
                            </span>
                          )}
                        </div>
                      )}

                      {!ingredient.available && ingredient.alternatives && ingredient.alternatives.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Możliwe zamienniki:{" "}
                          {ingredient.alternatives.map((alt) => alt.name).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Akcje */}
            {availability.missingIngredients > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handleAddMissingToShopping}
                  disabled={addingToShopping}
                  className="flex-1"
                >
                  {addingToShopping ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Dodawanie...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Dodaj brakujące do listy zakupów
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

