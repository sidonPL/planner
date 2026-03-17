"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  Search,
  X,
  Plus,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface GlobalIngredient {
  id: string;
  name: string;
  category: string | null;
  commonUnit: string | null;
  usageCount: number;
}

interface QuickIngredientPickerProps {
  onSelectIngredient: (ingredient: GlobalIngredient) => void;
}

export function QuickIngredientPicker({ onSelectIngredient }: QuickIngredientPickerProps) {
  const [ingredients, setIngredients] = useState<GlobalIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/global-ingredients?limit=100");
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredIngredients = searchQuery.trim()
    ? ingredients.filter(
        (ing) =>
          ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ing.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ingredients;

  // Grupuj po kategoriach
  const groupedIngredients = filteredIngredients.reduce((acc, ing) => {
    const category = ing.category || "Inne";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(ing);
    return acc;
  }, {} as Record<string, GlobalIngredient[]>);

  const categories = Object.keys(groupedIngredients).sort();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <div className="flex items-center justify-between p-3 bg-muted/50">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Szybki wybór składników</span>
          <span className="text-xs text-muted-foreground">
            ({filteredIngredients.length})
          </span>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="p-3 space-y-3">
          {/* Wyszukiwarka */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj składnika..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Lista składników */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Ładowanie...
              </div>
            ) : filteredIngredients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <p>
                  {searchQuery ? "Nie znaleziono składników" : "Brak składników"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-3">
                {categories.map((category) => (
                  <div key={category}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 px-2">
                      {category}
                    </div>
                    <div className="space-y-0.5">
                      {groupedIngredients[category].map((ingredient) => (
                        <button
                          key={ingredient.id}
                          onClick={() => {
                            onSelectIngredient(ingredient);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm",
                            "hover:bg-accent transition-colors text-left"
                          )}
                        >
                          <span className="flex-1 truncate">{ingredient.name}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {ingredient.commonUnit && (
                              <span className="text-xs px-1.5 py-0.5 bg-primary/10 rounded">
                                {ingredient.commonUnit}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {ingredient.usageCount}x
                            </span>
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Info */}
          <div className="text-xs text-muted-foreground text-center">
            💡 Kliknij składnik aby dodać go do przepisu
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

