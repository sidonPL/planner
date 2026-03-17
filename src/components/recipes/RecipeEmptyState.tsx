import { memo } from "react";
import { ChefHat, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RecipeEmptyStateProps {
  variant?: "no-recipes" | "no-results" | "no-favorites";
  onCreateNew?: () => void;
  onClearFilters?: () => void;
}

/**
 * Empty state dla różnych scenariuszy w module przepisów
 * Memoized - rerenderuje tylko gdy zmieni się variant lub callbacki
 */
export const RecipeEmptyState = memo(function RecipeEmptyState({
  variant = "no-recipes",
  onCreateNew,
  onClearFilters
}: RecipeEmptyStateProps) {
  const content = {
    "no-recipes": {
      icon: <ChefHat className="h-16 w-16 text-muted-foreground/50" />,
      title: "Brak przepisów",
      description: "Nie masz jeszcze żadnych przepisów. Stwórz swój pierwszy przepis i zacznij gotować!",
      action: onCreateNew && (
        <Button onClick={onCreateNew} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Dodaj pierwszy przepis
        </Button>
      ),
    },
    "no-results": {
      icon: <Search className="h-16 w-16 text-muted-foreground/50" />,
      title: "Brak wyników",
      description: "Nie znaleziono przepisów pasujących do wybranych filtrów. Spróbuj zmienić kryteria wyszukiwania.",
      action: onClearFilters && (
        <Button onClick={onClearFilters} variant="outline">
          Wyczyść filtry
        </Button>
      ),
    },
    "no-favorites": {
      icon: <ChefHat className="h-16 w-16 text-muted-foreground/50" />,
      title: "Brak ulubionych przepisów",
      description: "Nie masz jeszcze żadnych ulubionych przepisów. Dodaj gwiazdkę do przepisów, które najbardziej lubisz!",
      action: null,
    },
  };

  const { icon, title, description, action } = content[variant];

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
        {action}
      </CardContent>
    </Card>
  );
});

