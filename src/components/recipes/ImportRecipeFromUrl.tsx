"use client";

import { useState } from "react";
import { Link2, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface ImportedRecipe {
  name: string;
  description?: string | null;
  image?: string | null;
  ingredients?: Array<{ name: string; quantity?: number; unit?: string }>;
  steps?: Array<{ content: string; order?: number }>;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number;
  category?: string | null;
  cuisine?: string | null;
  tags?: string[];
}

interface ImportRecipeFromUrlProps {
  onImport: (recipe: ImportedRecipe) => void;
  triggerButton?: React.ReactNode;
}

export function ImportRecipeFromUrl({ onImport, triggerButton }: ImportRecipeFromUrlProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url.trim()) {
      setError("Wpisz adres URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recipes/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się zaimportować przepisu");
      }

      const parsedBy = data.parsedBy || "traditional";
      const message = parsedBy === "gemini"
        ? "🤖 Przepis zaimportowany przez AI! Sprawdź dane."
        : "Przepis zaimportowany! Sprawdź i edytuj dane przed zapisaniem.";

      toast.success(message);
      onImport(data.recipe);
      setOpen(false);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleImport();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline">
            <Link2 className="h-4 w-4 mr-2" />
            Importuj z URL
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importuj przepis z internetu</DialogTitle>
          <DialogDescription>
            Wklej link do przepisu z popularnych stron kulinarnych. Automatycznie wyodrębnimy składniki i kroki.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-url">Adres URL przepisu</Label>
            <Input
              id="recipe-url"
              placeholder="https://kuchnia.wp.pl/..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Obsługiwane strony:</strong> kuchnia.wp.pl, przepisy.pl, aniagotuje.pl i większość stron z
              przepisami kulinarnym. Po zaimportowaniu sprawdź i popraw dane.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Anuluj
            </Button>
            <Button onClick={handleImport} disabled={isLoading || !url.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importuję...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Importuj
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

