"use client";

import { useState } from "react";
import { Tag, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface RecipeTagsManagerProps {
  recipeId: string;
  currentTags: string[];
  onTagsUpdate: (tags: string[]) => void;
}

// Popular tag suggestions
const POPULAR_TAGS = [
  "szybkie", "łatwe", "zdrowe", "fit", "dietetyczne",
  "keto", "paleo", "wegetariańskie", "wegańskie",
  "obiad", "śniadanie", "kolacja", "deser",
  "włoskie", "azjatyckie", "polskie", "meksykańskie",
  "niskokaloryczne", "wysokobiałkowe", "bezglutenowe",
  "dla dzieci", "eleganckie", "na imprezę", "na grilla",
  "jesień", "zima", "lato", "wiosna",
  "tanie", "luksusowe", "comfort food",
];

export function RecipeTagsManager({ recipeId, currentTags, onTagsUpdate }: RecipeTagsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(currentTags);
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });

      if (response.ok) {
        toast.success("Tagi zaktualizowane");
        onTagsUpdate(tags);
        setIsOpen(false);
      } else {
        toast.error("Nie udało się zapisać tagów");
      }
    } catch (error) {
      console.error("Error saving tags:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSaving(false);
    }
  };

  // Suggest tags that aren't already added
  const suggestedTags = POPULAR_TAGS.filter(tag => !tags.includes(tag));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag className="mr-2 h-4 w-4" />
          Zarządzaj tagami
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Zarządzaj tagami przepisu</DialogTitle>
          <DialogDescription>
            Dodaj tagi aby łatwiej kategoryzować i wyszukiwać przepisy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Tags */}
          <div>
            <h4 className="text-sm font-medium mb-2">Obecne tagi ({tags.length})</h4>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak tagów</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {tag}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add New Tag */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Dodaj nowy tag</h4>
            <div className="flex gap-2">
              <Input
                placeholder="np. szybkie, zdrowe..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(newTag);
                  }
                }}
              />
              <Button
                onClick={() => addTag(newTag)}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj
              </Button>
            </div>
          </div>

          {/* Suggested Tags */}
          {suggestedTags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Popularne tagi</h4>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.slice(0, 20).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => addTag(tag)}
                  >
                    + {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            💡 <strong>Wskazówki:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Używaj krótkich, opisowych tagów</li>
              <li>Możesz dodać wiele tagów do jednego przepisu</li>
              <li>Tagi ułatwiają wyszukiwanie podobnych przepisów</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTags(currentTags);
              setIsOpen(false);
            }}
          >
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Zapisywanie..." : "Zapisz tagi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

