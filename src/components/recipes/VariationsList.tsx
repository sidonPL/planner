"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { GitBranch, Plus, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface Variation {
  id: string;
  variationName: string | null;
  description: string | null;
  createdAt: string;
  variantRecipe: {
    id: string;
    name: string;
    image: string | null;
    description: string | null;
    servings: number;
    totalTime: number | null;
    difficulty: string;
    createdAt: string;
  };
  createdBy: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface VariationsListProps {
  recipeId: string;
  recipeName: string;
  onCreateVariation: () => void;
}

type VariantParentInfo = {
  parentRecipe: {
    id: string;
    name: string;
  };
};

export function VariationsList({
  recipeId,
  recipeName,
  onCreateVariation,
}: VariationsListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [isVariant, setIsVariant] = useState<VariantParentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadVariations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/variations`);
      if (response.ok) {
        const data = await response.json();
        setVariations(data.variations || []);
        setIsVariant(data.isVariant);
      }
    } catch (error) {
      console.error("Error loading variations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    loadVariations();
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  const difficultyLabels: Record<string, { label: string; color: string }> = {
    EASY: { label: "Łatwy", color: "bg-green-100 text-green-800" },
    MEDIUM: { label: "Średni", color: "bg-yellow-100 text-yellow-800" },
    HARD: { label: "Trudny", color: "bg-red-100 text-red-800" },
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={handleOpen}>
          <GitBranch className="mr-2 h-4 w-4" />
          Warianty przepisu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Warianty: {recipeName}
          </DialogTitle>
        </DialogHeader>

        {/* Parent Recipe Info */}
        {isVariant && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
            <div className="text-sm font-medium mb-1">
              📖 Ten przepis jest wariantem:
            </div>
            <Link
              href={`/recipes/${isVariant.parentRecipe.id}`}
              className="text-sm text-primary hover:underline"
            >
              {isVariant.parentRecipe.name}
            </Link>
          </div>
        )}

        {/* Create New Variation Button */}
        <Button
          onClick={() => {
            setIsOpen(false);
            onCreateVariation();
          }}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Utwórz nowy wariant tego przepisu
        </Button>

        {/* Variations List */}
        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Ładowanie wariantów...
            </div>
          ) : variations.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Brak wariantów tego przepisu
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Utwórz pierwszy wariant klikając przycisk powyżej
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Warianty ({variations.length}):
              </div>
              {variations.map((variation) => (
                <Link
                  key={variation.id}
                  href={`/recipes/${variation.variantRecipe.id}`}
                  className="block"
                >
                  <div className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer">
                    <div className="flex gap-3">
                      {variation.variantRecipe.image && (
                        <img
                          src={variation.variantRecipe.image}
                          alt={`Zdjęcie wariantu: ${variation.variantRecipe.name}`}
                          className="w-16 h-16 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {variation.variantRecipe.name}
                        </h4>

                        {variation.variationName && (
                          <div className="text-sm text-muted-foreground">
                            Nazwa wariantu: {variation.variationName}
                          </div>
                        )}

                        {variation.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {variation.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className={difficultyLabels[variation.variantRecipe.difficulty]?.color}>
                            {difficultyLabels[variation.variantRecipe.difficulty]?.label}
                          </Badge>
                          <Badge variant="outline">
                            {variation.variantRecipe.servings} porcji
                          </Badge>
                          {variation.variantRecipe.totalTime && (
                            <Badge variant="outline">
                              {variation.variantRecipe.totalTime} min
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {variation.createdBy.name || "Użytkownik"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(variation.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          💡 <strong>Wskazówka:</strong> Warianty to modyfikacje przepisu (np. wersja
          wegańska, z innymi składnikami). Możesz tworzyć własne wersje i śledzić zmiany.
        </div>
      </DialogContent>
    </Dialog>
  );
}

