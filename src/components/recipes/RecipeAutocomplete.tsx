"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Clock, TrendingUp, Tag, Package, ChefHat, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface AutocompleteSuggestion {
  type: 'recipe' | 'category' | 'tag' | 'ingredient';
  id?: string;
  text: string;
  category?: string | null;
  image?: string | null;
  count?: number;
  recipeCount?: number;
  highlight?: { pre: string; match: string; post: string } | null;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export function RecipeAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Szukaj przepisów, składników, tagów...",
  className,
}: AutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [popular, setPopular] = useState<{ text: string; count: number }[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedValue = useDebounce(value, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentRecipeSearches');
    if (recent) {
      try {
        const parsed = JSON.parse(recent);
        setRecentSearches(parsed);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save search to recent
  const saveToRecent = useCallback((search: string) => {
    if (!search.trim()) return;

    const updated = [
      search,
      ...recentSearches.filter(s => s !== search)
    ].slice(0, 5);

    setRecentSearches(updated);
    localStorage.setItem('recentRecipeSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (!debouncedValue || debouncedValue.length < 2) {
      if (suggestions.length > 0) {
        setSuggestions([]);
      }
      return;
    }

    setIsLoading(true);
    fetch(`/api/recipes/autocomplete?q=${encodeURIComponent(debouncedValue)}`)
      .then(res => res.json())
      .then(data => {
        setSuggestions(data.suggestions || []);
        setPopular(data.popular || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Autocomplete error:', err);
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    const totalItems = suggestions.length + (recentSearches.length > 0 ? recentSearches.length : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectByIndex(selectedIndex);
        } else {
          saveToRecent(value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectByIndex = (index: number) => {
    if (index < recentSearches.length) {
      // Recent search selected
      const search = recentSearches[index];
      onChange(search);
      setIsOpen(false);
    } else {
      // Suggestion selected
      const suggestion = suggestions[index - recentSearches.length];
      handleSelect(suggestion);
    }
  };

  const handleSelect = (suggestion: AutocompleteSuggestion) => {
    onChange(suggestion.text);
    saveToRecent(suggestion.text);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect?.(suggestion);
  };

  const handleClearRecent = (search: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    localStorage.setItem('recentRecipeSearches', JSON.stringify(updated));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'recipe':
        return <ChefHat className="h-4 w-4" />;
      case 'category':
        return <Tag className="h-4 w-4" />;
      case 'tag':
        return <Tag className="h-4 w-4" />;
      case 'ingredient':
        return <Package className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const showSuggestions = isOpen && (suggestions.length > 0 || recentSearches.length > 0 || popular.length > 0);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-96 overflow-y-auto">
          {/* Recent Searches */}
          {recentSearches.length > 0 && value.length < 2 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                Ostatnio szukane
              </div>
              {recentSearches.map((search, index) => (
                <div
                  key={search}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 rounded cursor-pointer hover:bg-accent",
                    selectedIndex === index && "bg-accent"
                  )}
                  onClick={() => {
                    onChange(search);
                    setIsOpen(false);
                  }}
                >
                  <span className="text-sm">{search}</span>
                  <button
                    onClick={(e) => handleClearRecent(search, e)}
                    className="opacity-0 hover:opacity-100 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                <Search className="h-3 w-3" />
                Sugestie
              </div>
              {suggestions.map((suggestion, index) => {
                const adjustedIndex = index + recentSearches.length;
                return (
                  <div
                    key={`${suggestion.type}-${suggestion.id || suggestion.text}-${index}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-accent transition-colors",
                      selectedIndex === adjustedIndex && "bg-accent"
                    )}
                    onClick={() => handleSelect(suggestion)}
                  >
                    <div className="text-muted-foreground">
                      {getIcon(suggestion.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {suggestion.highlight ? (
                        <div className="text-sm truncate">
                          <span>{suggestion.highlight.pre}</span>
                          <span className="font-semibold text-primary">
                            {suggestion.highlight.match}
                          </span>
                          <span>{suggestion.highlight.post}</span>
                        </div>
                      ) : (
                        <div className="text-sm truncate">{suggestion.text}</div>
                      )}
                      {suggestion.category && (
                        <div className="text-xs text-muted-foreground truncate">
                          {suggestion.category}
                        </div>
                      )}
                    </div>
                    {suggestion.count !== undefined && suggestion.count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {suggestion.count}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Popular */}
          {popular.length > 0 && value.length < 2 && (
            <div className="p-2 border-t">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Popularne
              </div>
              {popular.slice(0, 3).map((item) => (
                <div
                  key={item.text}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded cursor-pointer hover:bg-accent"
                  onClick={() => {
                    onChange(item.text);
                    setIsOpen(false);
                  }}
                >
                  <span className="text-sm">{item.text}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.count}×
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

