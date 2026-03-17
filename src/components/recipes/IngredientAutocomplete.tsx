"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Package, Loader2, ShoppingCart } from "lucide-react";
import Image from "next/image";

interface Suggestion {
  id: string;
  name: string;
  category?: string | null;
  commonUnit?: string;
  usageCount?: number;
  // Z inwentarza
  fromInventory?: boolean;
  brand?: string | null;
  quantity?: number;
  unit?: string | null;
  imageUrl?: string | null;
  hasNutrition?: boolean;
  allergens?: string[];
  labels?: string[];
}

interface IngredientAutocompleteProps {
  value: string;
  onChange: (value: string, suggestion?: Suggestion) => void;
  onSelectFromInventory?: (suggestion: Suggestion) => void;
  placeholder?: string;
  className?: string;
}

export function IngredientAutocomplete({
  value,
  onChange,
  onSelectFromInventory,
  placeholder = "np. Mleko",
  className,
}: IngredientAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/recipes/suggest-ingredients?q=${encodeURIComponent(value)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounce);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.name, suggestion);
    setShowSuggestions(false);

    if (onSelectFromInventory && suggestion.fromInventory) {
      onSelectFromInventory(suggestion);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={className}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[400px] overflow-auto">
          <div className="py-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center gap-3"
              >
                {/* Ikona/Zdjęcie */}
                {suggestion.fromInventory && suggestion.imageUrl ? (
                  <div className="relative h-10 w-10 flex-shrink-0 rounded overflow-hidden border">
                    <Image
                      src={suggestion.imageUrl}
                      alt={suggestion.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 flex-shrink-0 rounded border bg-muted flex items-center justify-center">
                    {suggestion.fromInventory ? (
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* Informacje */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{suggestion.name}</span>
                    {suggestion.fromInventory && (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {suggestion.fromInventory ? (
                      <>
                        {suggestion.brand && (
                          <span className="text-xs text-muted-foreground">{suggestion.brand}</span>
                        )}
                        <span className="text-xs text-green-600 font-medium">
                          • {suggestion.quantity} {suggestion.unit} w inwentarzu
                        </span>
                      </>
                    ) : (
                      <>
                        {suggestion.category && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {suggestion.category}
                          </span>
                        )}
                        {suggestion.commonUnit && (
                          <span className="text-xs text-muted-foreground">
                            • {suggestion.commonUnit}
                          </span>
                        )}
                        {suggestion.usageCount && suggestion.usageCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            • {suggestion.usageCount}x użyty
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Etykiety z inwentarza */}
                  {suggestion.fromInventory && suggestion.labels && suggestion.labels.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {suggestion.labels.slice(0, 3).map((label, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] px-1 py-0">
                          {formatLabel(label)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wartości odżywcze indicator */}
                {suggestion.fromInventory && suggestion.hasNutrition && (
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      📊 Wartości odżywcze
                    </Badge>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {showSuggestions && !loading && suggestions.length === 0 && value.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground">
          Brak składników
          <div className="text-xs mt-1">Wpisz nazwę składnika ręcznie</div>
        </div>
      )}
    </div>
  );
}

function formatLabel(label: string): string {
  return label
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

