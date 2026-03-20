"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface OCRImportDialogProps {
  onSuccess: (recipe: unknown) => void;
}

export function OCRImportDialog({ onSuccess }: OCRImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Proszę wybrać plik graficzny");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Plik zbyt duży (max 10MB)");
      return;
    }

    // Convert to base64 for preview and API
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewImage(base64);
      await processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/recipes/import/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image.split(",")[1], // Send only base64 data
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "OCR failed");
      }

      const data = await response.json();

      toast.success("Przepis zaimportowany z obrazu!");
      onSuccess(data.recipe);
      setIsOpen(false);
      setPreviewImage(null);
    } catch (err) {
      const error = err as Error;
      console.error("OCR import error:", error);
      toast.error(error.message || "Nie udało się zaimportować przepisu z obrazu");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Camera className="h-4 w-4" />
          Import ze zdjęcia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Import przepisu ze zdjęcia (OCR)
          </DialogTitle>
          <DialogDescription>
            Zrób zdjęcie przepisu z książki lub wybierz obraz z galerii. AI wydobędzie tekst i utworzy przepis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Preview */}
          {previewImage && (
            <div className="border rounded-lg overflow-hidden">
              <img
                src={previewImage}
                alt="Podgląd receptury"
                className="w-full h-auto max-h-[300px] object-contain"
              />
            </div>
          )}

          {/* Upload Button */}
          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Przetwarzanie obrazu...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Wybierz zdjęcie
                </>
              )}
            </Button>

            {/* Camera option (mobile) */}
            <Button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute("capture", "environment");
                  fileInputRef.current.click();
                }
              }}
              disabled={isProcessing}
              variant="outline"
              className="w-full"
            >
              <Camera className="mr-2 h-4 w-4" />
              Zrób zdjęcie (mobile)
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Wskazówki dla najlepszych wyników:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Upewnij się że tekst jest wyraźny i dobrze oświetlony</li>
              <li>Unikaj odbić światła i cieni</li>
              <li>Trzymaj aparat równolegle do strony</li>
              <li>Działa najlepiej z wydrukami i książkami kucharskimi</li>
              <li>Obsługiwane formaty: JPG, PNG, WebP (max 10MB)</li>
            </ul>
          </div>

          {/* Examples */}
          <div className="border rounded-lg p-3 bg-muted/50">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">Przykłady użycia:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Przepis z książki kucharskiej</li>
                  <li>Wydrukowana kartka z przepisem</li>
                  <li>Zdjęcie ekranu z przepisem</li>
                  <li>Odręczne notatki (jeśli czytelne)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

