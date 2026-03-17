"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChefHat, CheckCircle2, AlertCircle, ShoppingCart, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

interface RecipeSuggestion {
  id: string;
  name: string;
  image?: string | null;
  category?: string | null;
  difficulty: string;
  prepTime?: number | null;
  cookTime?: number | null;
  servings: number;
  availableIngredients: string[];
  missingIngredients: string[];
  matchPercentage: number;
  totalIngredients: number;
}

interface RecipeSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeSuggestionsDialog({ open, onOpenChange }: RecipeSuggestionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [grouped, setGrouped] = useState<{
    perfect: RecipeSuggestion[];
    high: RecipeSuggestion[];
    medium: RecipeSuggestion[];
  }>({ perfect: [], high: [], medium: [] });

  useEffect(() => {
    if (open) {
      fetchSuggestions();
    }
  }, [open]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recipes/suggestions?minMatch=60");
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
        setGrouped(data.grouped);
      } else {
        toast.error("Nie udało się pobrać sugestii");
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  const addMissingToShoppingList = async (ingredients: string[]) => {
    try {
      for (const ingredient of ingredients) {
        await fetch("/api/shopping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: ingredient,
            note: "Do przepisu",
          }),
        });
      }
      toast.success(`Dodano ${ingredients.length} składników do listy zakupów`);
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      toast.error("Nie udało się dodać do listy zakupów");
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      EASY: "Łatwy",
      MEDIUM: "Średni",
      HARD: "Trudny",
    };
    return labels[difficulty] || difficulty;
  };

  const getMatchColor = (percentage: number) => {
    if (percentage === 100) return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= 80) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-orange-600 bg-orange-50 border-orange-200";
  };

  const getMatchIcon = (percentage: number) => {
    if (percentage === 100) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (percentage >= 80) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-orange-600" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            Co mogę ugotować?
          </DialogTitle>
          <DialogDescription>
            Sprawdź jakie przepisy możesz przygotować z produktów które masz w inwentarzu
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">
              Brak sugestii. Dodaj produkty do inwentarza lub stwórz więcej przepisów.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Perfect match */}
            {grouped.perfect.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Masz wszystkie składniki ({grouped.perfect.length})
                </h3>
                <div className="grid gap-3">
                  {grouped.perfect.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onAddToShoppingList={addMissingToShoppingList}
                      getDifficultyLabel={getDifficultyLabel}
                      getMatchColor={getMatchColor}
                      getMatchIcon={getMatchIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* High match */}
            {grouped.high.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Brakuje kilku składników ({grouped.high.length})
                </h3>
                <div className="grid gap-3">
                  {grouped.high.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onAddToShoppingList={addMissingToShoppingList}
                      getDifficultyLabel={getDifficultyLabel}
                      getMatchColor={getMatchColor}
                      getMatchIcon={getMatchIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Medium match */}
            {grouped.medium.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Potrzebujesz więcej składników ({grouped.medium.length})
                </h3>
                <div className="grid gap-3">
                  {grouped.medium.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onAddToShoppingList={addMissingToShoppingList}
                      getDifficultyLabel={getDifficultyLabel}
                      getMatchColor={getMatchColor}
                      getMatchIcon={getMatchIcon}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecipeCard({
  recipe,
  onAddToShoppingList,
  getDifficultyLabel,
  getMatchColor,
  getMatchIcon,
}: {
  recipe: RecipeSuggestion;
  onAddToShoppingList: (ingredients: string[]) => void;
  getDifficultyLabel: (difficulty: string) => string;
  getMatchColor: (percentage: number) => string;
  getMatchIcon: (percentage: number) => React.ReactElement;
}) {
  return (
    <Card className={`border-2 ${getMatchColor(recipe.matchPercentage)}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Zdjęcie */}
          {recipe.image ? (
            <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden">
              <Image src={recipe.image} alt={recipe.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
              <ChefHat className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {/* Informacje */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-lg">{recipe.name}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline">{getDifficultyLabel(recipe.difficulty)}</Badge>
                  {recipe.prepTime && (
                    <span className="text-xs text-muted-foreground">
                      Przygotowanie: {recipe.prepTime}min
                    </span>
                  )}
                  {recipe.cookTime && (
                    <span className="text-xs text-muted-foreground">
                      Gotowanie: {recipe.cookTime}min
                    </span>
                  )}
                </div>
              </div>

              {/* Matching badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {getMatchIcon(recipe.matchPercentage)}
                <span className="font-bold text-lg">{recipe.matchPercentage}%</span>
              </div>
            </div>

            {/* Składniki */}
            <div className="mt-3 space-y-2">
              <div className="text-sm">
                <span className="text-green-600 font-medium">
                  ✓ Masz: {recipe.availableIngredients.length}/{recipe.totalIngredients}
                </span>
              </div>

              {recipe.missingIngredients.length > 0 && (
                <div className="text-sm">
                  <span className="text-orange-600 font-medium">
                    Brakuje ({recipe.missingIngredients.length}):
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {recipe.missingIngredients.slice(0, 3).join(", ")}
                    {recipe.missingIngredients.length > 3 && ` +${recipe.missingIngredients.length - 3}`}
                  </span>
                </div>
              )}
            </div>

            {/* Akcje */}
            <div className="flex gap-2 mt-3">
              <Button size="sm" asChild>
                <Link href={`/recipes/${recipe.id}`}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Zobacz przepis
                </Link>
              </Button>

              {recipe.missingIngredients.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddToShoppingList(recipe.missingIngredients)}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Dodaj do zakupów
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

