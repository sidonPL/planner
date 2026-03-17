"use client";

import { useState } from "react";
import { Youtube, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ImportedRecipe {
  name: string;
  ingredients: unknown[];
  steps: unknown[];
  [key: string]: unknown;
}

interface YouTubeImportDialogProps {
  onSuccess: (recipe: ImportedRecipe) => void;
}

export function YouTubeImportDialog({ onSuccess }: YouTubeImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error("Wklej link do filmu YouTube");
      return;
    }

    // Validate YouTube URL
    const isValidYouTube = /youtube\.com\/watch\?v=|youtu\.be\//.test(url);
    if (!isValidYouTube) {
      toast.error("To nie wygląda na link YouTube");
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch("/api/recipes/import/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Import failed");
      }

      const data = await response.json();

      toast.success(`Zaimportowano: ${data.videoData.title}`);
      onSuccess(data.recipe);
      setIsOpen(false);
      setUrl("");
    } catch (err) {
      const error = err as Error;
      console.error("YouTube import error:", error);
      toast.error(error.message || "Nie udało się zaimportować przepisu z YouTube");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Youtube className="h-4 w-4" />
          Import z YouTube
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Import przepisu z YouTube
          </DialogTitle>
          <DialogDescription>
            Wklej link do filmu YouTube z przepisem. AI wydobędzie składniki i kroki z opisu i napisów.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="youtube-url">Link YouTube</Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isImporting) {
                  handleImport();
                }
              }}
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Wskazówki:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Działa najlepiej z filmami które mają składniki w opisie</li>
              <li>AI wydobędzie przepis z tytułu, opisu i napisów (jeśli dostępne)</li>
              <li>Po imporcie możesz edytować przepis przed zapisaniem</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setUrl("");
              }}
              disabled={isImporting}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !url.trim()}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importowanie...
                </>
              ) : (
                <>
                  <Youtube className="mr-2 h-4 w-4" />
                  Importuj
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Example URLs */}
        <div className="border-t pt-4">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-2">Przykładowe formaty URL:</p>
            <ul className="space-y-1 font-mono text-[10px]">
              <li>youtube.com/watch?v=VIDEO_ID</li>
              <li>youtu.be/VIDEO_ID</li>
              <li>youtube.com/embed/VIDEO_ID</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

