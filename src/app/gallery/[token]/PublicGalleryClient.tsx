"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Heart, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";

interface PublicPhoto {
  id: string;
  tripId: string;
  url: string;
  caption: string | null;
  uploadedByName: string | null;
  createdAt: Date | string;
  likes: number;
}

interface PublicGalleryClientProps {
  tripName: string;
  destination: string | null;
  photos: PublicPhoto[];
  token: string;
}

export function PublicGalleryClient({
  tripName,
  destination,
  photos: initialPhotos,
  token,
}: PublicGalleryClientProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "likes">("newest");

  const filteredPhotos = [...initialPhotos]
    .filter((photo) => (photo.caption || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "likes") return b.likes - a.likes;
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? bTime - aTime : aTime - bTime;
    });

  const selectedPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

  const handlePrevPhoto = useCallback(() => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((prev) =>
        prev === 0 ? filteredPhotos.length - 1 : (prev ?? 0) - 1
      );
    }
  }, [selectedPhotoIndex, filteredPhotos.length]);

  const handleNextPhoto = useCallback(() => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((prev) =>
        prev === filteredPhotos.length - 1 ? 0 : (prev ?? 0) + 1
      );
    }
  }, [selectedPhotoIndex, filteredPhotos.length]);

  const handleDownloadPhoto = useCallback(async () => {
    if (!selectedPhoto) return;

    const downloadBlob = (blob: Blob, photoId: string) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tripName}-${photoId}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Zdjęcie zostało pobrane");
    };

    try {
      const response = await fetch(`/api/gallery/${token}/photo/${selectedPhoto.id}`);
      if (!response.ok) {
        toast.error("Nie udało się pobrać zdjęcia");
        return;
      }

      const data = await response.json();
      
      // Jeśli endpoint zwrócił URL, pobierz bezpośrednio
      if (data.redirect && data.url) {
        const downloadResponse = await fetch(data.url);
        if (!downloadResponse.ok) throw new Error("Failed to download");
        const blob = await downloadResponse.blob();
        downloadBlob(blob, selectedPhoto.id);
        return;
      }

      // W przeciwnym razie, zawartość powinna być w response.blob()
      const blob = await response.blob();
      downloadBlob(blob, selectedPhoto.id);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Nie udało się pobrać zdjęcia");
    }
  }, [selectedPhoto, token, tripName]);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Galeria wyjazdu: {tripName}</h1>
        {destination && <p className="text-muted-foreground mt-1">📍 {destination}</p>}
      </header>

      {/* Gallery tools */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Szukaj po opisie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "likes")}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="newest">Najnowsze</option>
            <option value="oldest">Najstarsze</option>
            <option value="likes">Najwięcej serduszek</option>
          </select>
        </div>
        <p className="text-sm text-muted-foreground">
          {initialPhotos.length} {initialPhotos.length === 1 ? "zdjęcie" : "zdjęć"}
        </p>
      </div>

      {/* Photo grid */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo, index) => (
            <article
              key={photo.id}
              className="rounded-lg overflow-hidden bg-card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedPhotoIndex(index)}
            >
              <div className="aspect-square relative">
                <img
                  src={photo.url}
                  alt={photo.caption || "Zdjęcie z wyjazdu"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {photo.likes}
                  </Badge>
                </div>
              </div>
              <div className="p-3 space-y-1">
                {photo.caption && (
                  <p className="text-sm font-medium line-clamp-2">{photo.caption}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {photo.uploadedByName || "Uczestnik"} •{" "}
                  {format(new Date(photo.createdAt), "d MMM yyyy", { locale: pl })}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Brak zdjęć w tej galerii.
        </div>
      )}

      {/* Lightbox dialog */}
      {selectedPhoto && (
        <Dialog
          open={selectedPhotoIndex !== null}
          onOpenChange={() => setSelectedPhotoIndex(null)}
        >
          <DialogContent className="max-w-4xl">
            <VisuallyHidden>
              <DialogTitle>Podgląd zdjęcia z galerii</DialogTitle>
            </VisuallyHidden>
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Podgląd zdjęcia z wyjazdu"}
                  className="w-full rounded-lg"
                />
                {filteredPhotos.length > 1 && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={handlePrevPhoto}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={handleNextPhoto}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <div className="space-y-3">
                {selectedPhoto.caption && (
                  <p className="font-medium text-lg">{selectedPhoto.caption}</p>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>
                      {selectedPhoto.uploadedByName || "Uczestnik"}
                    </span>
                    <span>
                      {format(new Date(selectedPhoto.createdAt), "d MMM yyyy HH:mm", {
                        locale: pl,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost">
                      <Heart className="h-4 w-4 mr-1" />
                      {selectedPhoto.likes}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownloadPhoto}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}









