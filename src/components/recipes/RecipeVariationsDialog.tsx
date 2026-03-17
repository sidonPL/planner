"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { GitBranch, Plus, Clock, Users, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface RecipeVariation {
  id: string;
  variationName: string;
  description?: string;
  createdAt: string;
  variantRecipe: {
    id: string;
    name: string;
    description?: string;
    image?: string;
    prepTime?: number;
    cookTime?: number;
    servings: number;
    difficulty: string;
    tags: string[];
    isVegan: boolean;
    isVegetarian: boolean;
    isGlutenFree: boolean;
    createdBy: {
      id: string;
      name?: string;
      avatar?: string;
    };
  };
  createdBy: {
    id: string;
    name?: string;
    avatar?: string;
  };
}

interface RecipeVariationsDialogProps {
  recipeId: string;
  recipeName: string;
  children?: React.ReactNode;
  onCreateVariation?: () => void;
}

export function RecipeVariationsDialog({
  recipeId,
  recipeName,
  children,
  onCreateVariation,
}: RecipeVariationsDialogProps) {
  const [open, setOpen] = useState(false);
  const [variations, setVariations] = useState<RecipeVariation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const loadVariations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/variations`);
      if (!res.ok) throw new Error("Nie udało się pobrać wariantów");
      const data = await res.json();
      setVariations(data);
    } catch (error) {
      console.error("Error loading variations:", error);
      toast.error("Błąd podczas ładowania wariantów");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadVariations();
    }
  };

  const handleViewRecipe = (variantRecipeId: string) => {
    router.push(`/recipes?id=${variantRecipeId}`);
    setOpen(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "bg-green-500";
      case "MEDIUM":
        return "bg-yellow-500";
      case "HARD":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "Łatwy";
      case "MEDIUM":
        return "Średni";
      case "HARD":
        return "Trudny";
      default:
        return difficulty;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <GitBranch className="w-4 h-4 mr-2" />
            Warianty
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Warianty przepisu: {recipeName}
          </DialogTitle>
          <DialogDescription>
            Zobacz wszystkie warianty tego przepisu lub utwórz nowy wariant.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            {variations.length === 0
              ? "Brak wariantów"
              : `Znaleziono ${variations.length} ${variations.length === 1 ? "wariant" : "wariantów"}`}
          </p>
          <Button
            onClick={() => {
              setOpen(false);
              onCreateVariation?.();
            }}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Utwórz wariant
          </Button>
        </div>

        <Separator />

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : variations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <GitBranch className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Brak wariantów tego przepisu
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Utwórz pierwszy wariant, aby dostosować przepis do swoich potrzeb
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {variations.map((variation) => (
                <Card key={variation.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {variation.variationName}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {variation.variantRecipe.name}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="secondary"
                        className={getDifficultyColor(
                          variation.variantRecipe.difficulty
                        )}
                      >
                        {getDifficultyLabel(variation.variantRecipe.difficulty)}
                      </Badge>
                    </div>
                    {variation.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {variation.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Metadane */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {variation.variantRecipe.prepTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              Przygotowanie:{" "}
                              {variation.variantRecipe.prepTime} min
                            </span>
                          </div>
                        )}
                        {variation.variantRecipe.cookTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              Gotowanie: {variation.variantRecipe.cookTime} min
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>
                            {variation.variantRecipe.servings}{" "}
                            {variation.variantRecipe.servings === 1
                              ? "porcja"
                              : "porcje"}
                          </span>
                        </div>
                      </div>

                      {/* Tagi dietetyczne */}
                      <div className="flex flex-wrap gap-2">
                        {variation.variantRecipe.isVegan && (
                          <Badge variant="outline" className="bg-green-50">
                            Wegańskie
                          </Badge>
                        )}
                        {variation.variantRecipe.isVegetarian && (
                          <Badge variant="outline" className="bg-green-50">
                            Wegetariańskie
                          </Badge>
                        )}
                        {variation.variantRecipe.isGlutenFree && (
                          <Badge variant="outline" className="bg-yellow-50">
                            Bezglutenowe
                          </Badge>
                        )}
                        {variation.variantRecipe.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {variation.variantRecipe.tags.length > 3 && (
                          <Badge variant="outline">
                            +{variation.variantRecipe.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Autor i data */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Utworzył:{" "}
                          {variation.createdBy.name || "Nieznany użytkownik"}
                        </span>
                        <span>
                          {new Date(variation.createdAt).toLocaleDateString(
                            "pl-PL",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>

                      {/* Przycisk */}
                      <Button
                        onClick={() =>
                          handleViewRecipe(variation.variantRecipe.id)
                        }
                        className="w-full"
                        variant="secondary"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Zobacz przepis
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

