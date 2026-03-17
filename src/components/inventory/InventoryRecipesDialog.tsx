"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChefHat, Clock, Users, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Recipe {
  id: string;
  name: string;
  image: string | null;
  category: string | null;
  difficulty: string;
  prepTime: number | null;
  cookTime: number | null;
  servings: number;
  usedIn: Array<{
    quantity: number;
    unit: string | null;
    name: string | null;
  }>;
}

interface InventoryRecipesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
}

const difficultyLabels: Record<string, { label: string; color: string }> = {
  EASY: { label: "Łatwy", color: "bg-green-100 text-green-800" },
  MEDIUM: { label: "Średni", color: "bg-yellow-100 text-yellow-800" },
  HARD: { label: "Trudny", color: "bg-red-100 text-red-800" },
};

export function InventoryRecipesDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
}: InventoryRecipesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/${itemId}/recipes`);

      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
      } else {
        toast.error("Nie udało się pobrać przepisów");
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  // Fetch recipes when dialog opens
  useEffect(() => {
    if (open) {
      void fetchRecipes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId]);

  const formatTime = (minutes: number | null) => {
    if (!minutes) return "—";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            Przepisy z: {itemName}
          </DialogTitle>
          <DialogDescription>
            Przepisy które używają tego składnika
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">
              Brak przepisów używających tego składnika
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Dodaj nowe przepisy lub użyj tego produktu w istniejących
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              Znaleziono {recipes.length} przepis(ów)
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {recipes.map((recipe) => {
                  const difficulty = difficultyLabels[recipe.difficulty];
                  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

                  return (
                    <div
                      key={recipe.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        {recipe.image ? (
                          <div
                            className="w-20 h-20 flex-shrink-0 rounded-lg bg-cover bg-center"
                            style={{ backgroundImage: `url(${recipe.image})` }}
                          />
                        ) : (
                          <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                            <ChefHat className="h-10 w-10 text-orange-300" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold line-clamp-1">{recipe.name}</h4>

                          <div className="flex flex-wrap gap-2 mt-2">
                            {difficulty && (
                              <Badge variant="secondary" className={difficulty.color}>
                                {difficulty.label}
                              </Badge>
                            )}
                            {totalTime > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(totalTime)}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {recipe.servings}
                            </span>
                          </div>

                          {/* Usage details */}
                          <div className="mt-2 text-sm text-muted-foreground">
                            {recipe.usedIn.map((usage, idx) => (
                              <div key={idx}>
                                Używa: {usage.quantity} {usage.unit}
                              </div>
                            ))}
                          </div>

                          {/* Action */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            asChild
                          >
                            <Link href={`/recipes/${recipe.id}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Zobacz przepis
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

