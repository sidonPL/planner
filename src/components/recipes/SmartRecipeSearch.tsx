"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import { Search, Clock, Users, ChefHat, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { RecipeAutocomplete } from "./RecipeAutocomplete";
import Link from "next/link";

interface SearchResult {
  id: string;
  name: string;
  image: string | null;
  category: string | null;
  difficulty: string;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  servings: number;
  tags: string[];
  cuisine: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
}

interface CookableRecipe {
  id: string;
  name: string;
  image: string | null;
  category: string | null;
  difficulty: string;
  totalTime: number | null;
  servings: number;
}

interface IngredientMatch {
  id: string;
  name: string;
  image: string | null;
  matchedIngredients: string[];
}

interface SearchSuggestions {
  tags: string[];
  cuisines: string[];
  categories: string[];
}

interface SmartRecipeSearchProps {
  onRecipeSelect?: (recipeId: string) => void;
  placeholder?: string;
  className?: string;
  useAutocomplete?: boolean; // NEW: Enable autocomplete mode
}

export const SmartRecipeSearch = forwardRef<HTMLInputElement, SmartRecipeSearchProps>(
  function SmartRecipeSearch(
    {
      onRecipeSelect,
      placeholder = "Szukaj przepisów, składników, tagów...",
      className,
      useAutocomplete = true, // Default: use new autocomplete
    },
    ref
  ) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [ingredientMatches, setIngredientMatches] = useState<IngredientMatch[]>([]);
    const [cookableNow, setCookableNow] = useState<CookableRecipe[]>([]);
    const [suggestions, setSuggestions] = useState<SearchSuggestions>({
      tags: [],
      cuisines: [],
      categories: [],
    });
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search results
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setIngredientMatches([]);
      setCookableNow([]);
      setSuggestions({ tags: [], cuisines: [], categories: [] });
      setIsOpen(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/recipes/smart-search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await response.json();
        setResults(data.recipes || []);
        setIngredientMatches(data.ingredientMatches || []);
        setCookableNow(data.cookableNow || []);
        setSuggestions(data.suggestions || { tags: [], cuisines: [], categories: [] });
        setIsOpen(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getTotalTime = (recipe: SearchResult) => {
    return recipe.totalTime || (recipe.prepTime || 0) + (recipe.cookTime || 0);
  };

  const handleRecipeClick = (recipeId: string) => {
    setIsOpen(false);
    setQuery("");
    if (onRecipeSelect) {
      onRecipeSelect(recipeId);
    }
  };

  const hasResults = results.length > 0 || ingredientMatches.length > 0 || cookableNow.length > 0;
  const hasSuggestions =
    suggestions.tags.length > 0 || suggestions.cuisines.length > 0 || suggestions.categories.length > 0;

  // NEW: Use autocomplete mode if enabled
  if (useAutocomplete) {
    return (
      <RecipeAutocomplete
        value={query}
        onChange={setQuery}
        onSelect={(suggestion) => {
          if (suggestion.type === 'recipe' && suggestion.id) {
            onRecipeSelect?.(suggestion.id);
          }
          // For other types, just set the search query
          setQuery(suggestion.text);
        }}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  // Original search UI (fallback)
  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (hasResults || hasSuggestions) setIsOpen(true);
          }}
          className="pl-9"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (hasResults || hasSuggestions) && (
        <Card className="absolute z-50 mt-2 w-full max-h-[600px] overflow-y-auto shadow-lg">
          <div className="p-2">
            {/* Direct Recipe Matches */}
            {results.length > 0 && (
              <div className="mb-4">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Przepisy</div>
                <div className="space-y-1">
                  {results.map((recipe) => {
                    const totalTime = getTotalTime(recipe);
                    return (
                      <Link
                        key={recipe.id}
                        href={`/recipes/${recipe.id}`}
                        onClick={() => handleRecipeClick(recipe.id)}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
                      >
                        {recipe.image ? (
                          <div
                            className="w-12 h-12 rounded bg-cover bg-center flex-shrink-0"
                            style={{ backgroundImage: `url(${recipe.image})` }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center flex-shrink-0">
                            <ChefHat className="h-6 w-6 text-orange-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{recipe.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {totalTime > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(totalTime)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {recipe.servings}
                            </span>
                            {recipe.cuisine && <span>• {recipe.cuisine}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {recipe.isVegan && <Badge variant="secondary">🌱</Badge>}
                          {recipe.isVegetarian && !recipe.isVegan && <Badge variant="secondary">🥬</Badge>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cookable Now - NEW! */}
            {cookableNow.length > 0 && (
              <div className="mb-4">
                <div className="px-2 py-1 text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                  <ChefHat className="h-3 w-3" />
                  🍳 Możesz ugotować teraz!
                </div>
                <div className="space-y-1">
                  {cookableNow.map((recipe) => (
                    <Link
                      key={recipe.id}
                      href={`/recipes/${recipe.id}`}
                      onClick={() => handleRecipeClick(recipe.id)}
                      className="flex items-center gap-3 rounded-lg p-2 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors border border-green-200 dark:border-green-800"
                    >
                      {recipe.image ? (
                        <div
                          className="w-12 h-12 rounded bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${recipe.image})` }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                          <ChefHat className="h-6 w-6 text-green-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-green-900 dark:text-green-100">{recipe.name}</div>
                        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                          {recipe.totalTime && recipe.totalTime > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(recipe.totalTime)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {recipe.servings}
                          </span>
                          <span className="text-xs bg-green-200 dark:bg-green-900 px-1.5 py-0.5 rounded">
                            ✅ Masz składniki
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredient Matches */}
            {ingredientMatches.length > 0 && (
              <div className="mb-4">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Przepisy zawierające składnik
                </div>
                <div className="space-y-1">
                  {ingredientMatches.map((match) => (
                    <Link
                      key={match.id}
                      href={`/recipes/${match.id}`}
                      onClick={() => handleRecipeClick(match.id)}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
                    >
                      {match.image ? (
                        <div
                          className="w-10 h-10 rounded bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${match.image})` }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                          <ChefHat className="h-5 w-5 text-green-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{match.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Zawiera: {match.matchedIngredients.join(", ")}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {hasSuggestions && (
              <div>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Sugestie</div>
                <div className="flex flex-wrap gap-1 p-2">
                  {suggestions.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setQuery(tag)}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {suggestions.cuisines.map((cuisine) => (
                    <Badge
                      key={cuisine}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setQuery(cuisine)}
                    >
                      🌍 {cuisine}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {!hasResults && !hasSuggestions && debouncedQuery.length >= 2 && !isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nie znaleziono przepisów dla &quot;{debouncedQuery}&quot;
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
});

