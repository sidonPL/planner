"use client";

import { useState } from "react";
import { Lightbulb, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Substitution {
  id: string;
  originalName: string;
  substituteName: string;
  ratio: number;
  notes: string | null;
  category: string | null;
  confidence: number;
}

interface IngredientSubstitutionSuggesterProps {
  ingredientName: string;
  onSelect?: (substitution: Substitution) => void;
}

export function IngredientSubstitutionSuggester({
  ingredientName,
  onSelect,
}: IngredientSubstitutionSuggesterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSubstitutions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/ingredients/substitutions?ingredient=${encodeURIComponent(ingredientName)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSubstitutions(data.substitutions || []);
      } else {
        toast.error("Nie udało się załadować zamienników");
      }
    } catch (error) {
      console.error("Error loading substitutions:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    loadSubstitutions();
  };

  const handleSelect = (substitution: Substitution) => {
    onSelect?.(substitution);
    setIsOpen(false);
    toast.success(`Zamiennik: ${substitution.substituteName}`);
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;

    const colors: Record<string, string> = {
      vegan: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      "gluten-free": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      "dairy-free": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      healthier: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      "low-carb": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      common: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };

    return (
      <Badge variant="outline" className={colors[category] || ""}>
        {category}
      </Badge>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600 dark:text-green-400";
    if (confidence >= 0.8) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          className="h-6 px-2 text-xs"
        >
          <Lightbulb className="mr-1 h-3 w-3" />
          Zamienniki
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Zamienniki dla: <span className="font-bold">{ingredientName}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Szukam zamienników...
            </div>
          ) : substitutions.length === 0 ? (
            <div className="text-center py-8">
              <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Brak dostępnych zamienników dla tego składnika
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Możesz dodać własny zamiennik
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {substitutions.map((sub) => (
                <div
                  key={sub.id}
                  className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleSelect(sub)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sub.substituteName}</span>
                      {sub.category && getCategoryBadge(sub.category)}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {sub.ratio !== 1.0 && (
                    <div className="text-sm text-muted-foreground mb-1">
                      Proporcja: <span className="font-medium">{sub.ratio}:1</span>
                    </div>
                  )}

                  {sub.notes && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{sub.notes}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className={`text-xs ${getConfidenceColor(sub.confidence)}`}>
                      Pewność: {(sub.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          💡 <strong>Wskazówka:</strong> Kliknij na zamiennik aby go użyć. Zawsze sprawdź
          proporcje i notatki przed zastosowaniem.
        </div>
      </DialogContent>
    </Dialog>
  );
}

