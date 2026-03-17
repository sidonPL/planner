"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  Youtube,
  Loader2,
  Upload,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

interface ImportedRecipe {
  name: string;
  description?: string | null;
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    optional?: boolean;
  }>;
  steps: Array<{
    content: string;
    duration?: number | null;
    image?: string | null;
    temperature?: number | null;
    tip?: string | null;
    isOptional?: boolean;
  }>;
  image?: string | null;
  category?: string | null;
  servings?: number;
  prepTime?: number | null;
  cookTime?: number | null;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  tags?: string[];
}

interface MultiImportDialogProps {
  onImport: (recipe: ImportedRecipe) => void;
  triggerButton?: React.ReactNode;
}

export function MultiImportDialog({ onImport, triggerButton }: MultiImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // URL Import
  const [url, setUrl] = useState("");

  // OCR Import
  const [ocrImage, setOcrImage] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");

  // YouTube Import
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const handleUrlImport = async () => {
    if (!url.trim()) {
      toast.error("Wpisz adres URL");
      return;
    }

    setIsLoading(true);
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

      toast.success(data.parsedBy === "gemini"
        ? "🤖 Przepis zaimportowany przez AI!"
        : "✅ Przepis zaimportowany!");
      onImport(data.recipe);
      setOpen(false);
      setUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOcrImport = async () => {
    if (!ocrImage && !ocrText.trim()) {
      toast.error("Dodaj zdjęcie lub wklej tekst przepisu");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      if (ocrImage) {
        formData.append("image", ocrImage);
      }
      if (ocrText) {
        formData.append("text", ocrText);
      }

      const response = await fetch("/api/recipes/import-ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się rozpoznać przepisu");
      }

      toast.success("📸 Przepis rozpoznany przez AI!");
      onImport(data.recipe);
      setOpen(false);
      setOcrImage(null);
      setOcrText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  const handleYoutubeImport = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Wpisz link do filmu YouTube");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/recipes/import-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się zaimportować z YouTube");
      }

      toast.success("🎥 Przepis zaimportowany z YouTube!");
      onImport(data.recipe);
      setOpen(false);
      setYoutubeUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importuj przepis
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importuj przepis</DialogTitle>
          <DialogDescription>
            Wybierz sposób importu przepisu - z URL, zdjęcia lub filmu YouTube
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url">
              <Link2 className="h-4 w-4 mr-2" />
              URL
            </TabsTrigger>
            <TabsTrigger value="ocr">
              <Camera className="h-4 w-4 mr-2" />
              OCR/Zdjęcie
            </TabsTrigger>
            <TabsTrigger value="youtube">
              <Youtube className="h-4 w-4 mr-2" />
              YouTube
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipe-url">Adres URL przepisu</Label>
              <Input
                id="recipe-url"
                placeholder="https://kuchnia.wp.pl/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Obsługiwane strony: kuchnia.pl, aniagotuje.pl, przepisy.pl i inne
              </p>
            </div>
            <Button onClick={handleUrlImport} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importuj z URL
            </Button>
          </TabsContent>

          <TabsContent value="ocr" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipe-image">Zdjęcie przepisu</Label>
              <Input
                id="recipe-image"
                type="file"
                accept="image/*"
                onChange={(e) => setOcrImage(e.target.files?.[0] || null)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Zrób zdjęcie przepisu z książki lub ekranu
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-text">Lub wklej tekst przepisu</Label>
              <Textarea
                id="recipe-text"
                placeholder="Wklej tutaj tekst przepisu..."
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                rows={8}
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleOcrImport} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rozpoznaj przepis (AI)
            </Button>
          </TabsContent>

          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">Link do filmu YouTube</Label>
              <Input
                id="youtube-url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Przepis zostanie wyodrębyniony z napisów i opisu filmu
              </p>
            </div>
            <Button onClick={handleYoutubeImport} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importuj z YouTube
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

