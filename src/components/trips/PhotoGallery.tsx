"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Calendar, User, Heart, Download, Share2, Copy, Check, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

export interface TripPhoto {
  id: string;
  tripId: string;
  url: string;
  caption: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: Date | string;
  likes: number;
  likedByMe?: boolean;
}

interface PhotoGalleryProps {
  tripId: string;
  photos: TripPhoto[];
  currentUserId: string;
  onPhotosChange: (photos: TripPhoto[]) => void;
}

type GalleryShareLink = {
  id: string;
  token: string;
  url: string;
  createdAt: string | Date;
  expiresAt: string | Date | null;
};

export function PhotoGallery({ tripId, photos, currentUserId, onPhotosChange }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<TripPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newCaption, setNewCaption] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "likes">("newest");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareTtlDays, setShareTtlDays] = useState<"0" | "1" | "7" | "30">("7");
  const [shareLinks, setShareLinks] = useState<GalleryShareLink[]>([]);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [editCaptionText, setEditCaptionText] = useState("");

  const filteredPhotos = [...photos]
    .filter((photo) => (photo.caption || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "likes") return b.likes - a.likes;
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? bTime - aTime : aTime - bTime;
    });

  const refreshPhotos = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/photos`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) {
        onPhotosChange(data as TripPhoto[]);
      }
    } catch {
      // Cichy fallback - lokalny stan zostaje.
    }
  }, [tripId, onPhotosChange]);

  const refreshShareLinks = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/gallery/share`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) {
        setShareLinks(data as GalleryShareLink[]);
      }
    } catch {
      // Bez twardego błędu - to sekcja dodatkowa.
    }
  }, [tripId]);

  useEffect(() => {
    void refreshPhotos();
    void refreshShareLinks();
  }, [refreshPhotos, refreshShareLinks]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('photos', file);
      });
      formData.append('caption', newCaption);

      const response = await fetch(`/api/trips/${tripId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newPhotos = await response.json();
        onPhotosChange([...newPhotos, ...photos]);
        void refreshPhotos();
        setNewCaption("");
        toast.success(`Dodano ${files.length} zdjęć`);
      } else {
        // Fallback: jeśli dedykowane API zdjęć nie istnieje, użyj ogólnego uploadu plików.
        if (response.status === 404 || response.status === 405) {
          const uploadedPhotos: TripPhoto[] = [];

          for (const file of Array.from(files)) {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('folder', `trips/${tripId}`);

            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: uploadFormData,
            });

            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok || !uploadData?.url) {
              throw new Error(uploadData?.error || 'Nie udało się przesłać zdjęcia');
            }

            uploadedPhotos.push({
              id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              tripId,
              url: uploadData.url,
              caption: newCaption || null,
              uploadedBy: currentUserId,
              uploadedByName: 'Ty',
              createdAt: new Date(),
              likes: 0,
            });
          }

          onPhotosChange([...uploadedPhotos, ...photos]);
          void refreshPhotos();
          setNewCaption('');
          toast.success(`Dodano ${uploadedPhotos.length} zdjęć`);
        } else {
          const errorData = await response.json().catch(() => null);
          toast.error(errorData?.error || 'Nie udało się przesłać zdjęć');
        }
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas przesyłania');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to zdjęcie?')) return;

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    try {
      // Dla lokalnego fallbacku usuwamy plik przez ogólny endpoint /api/upload/[...path].
      let response: Response;
      if (photo.id.startsWith('local-')) {
        const relativePath = photo.url.replace(/^\/uploads\//, '');
        response = await fetch(`/api/upload/${relativePath}`, { method: 'DELETE' });
      } else {
        response = await fetch(`/api/trips/${tripId}/photos/${photoId}`, {
          method: 'DELETE',
        });
      }

      if (response.ok) {
        onPhotosChange(photos.filter(p => p.id !== photoId));
        void refreshPhotos();
        setSelectedPhoto(null);
        toast.success('Zdjęcie zostało usunięte');
      } else {
        toast.error('Nie udało się usunąć zdjęcia');
      }
    } catch (error) {
      console.error('Photo delete error:', error);
      toast.error('Wystąpił błąd');
    }
  };

  const handleLikePhoto = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    if (photo.likedByMe) {
      toast.info('To zdjęcie zostało już przez Ciebie polubione');
      return;
    }

    try {
      // Dla lokalnych zdjęć increment realizujemy klientowo.
      if (photo.id.startsWith('local-')) {
        onPhotosChange(photos.map((p) =>
          p.id === photoId ? { ...p, likes: p.likes + 1, likedByMe: true } : p
        ));
        return;
      }

      const response = await fetch(`/api/trips/${tripId}/photos/${photoId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const updatedPhoto = await response.json();
        onPhotosChange(photos.map(p => p.id === photoId ? updatedPhoto : p));
        void refreshPhotos();
      } else {
        const data = await response.json().catch(() => null);
        toast.error(data?.error || 'Nie udało się polubić zdjęcia');
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleUnlikePhoto = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    if (!photo.likedByMe) {
      toast.info('Nie polubiłeś tego zdjęcia');
      return;
    }

    try {
      // Dla lokalnych zdjęć decrement realizujemy klientowo.
      if (photo.id.startsWith('local-')) {
        onPhotosChange(photos.map((p) =>
          p.id === photoId ? { ...p, likes: Math.max(0, p.likes - 1), likedByMe: false } : p
        ));
        return;
      }

      const response = await fetch(`/api/trips/${tripId}/photos/${photoId}/like`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedPhoto = await response.json();
        onPhotosChange(photos.map(p => p.id === photoId ? updatedPhoto : p));
        void refreshPhotos();
        toast.success('Serduszko zostało cofnięte');
      } else {
        const data = await response.json().catch(() => null);
        toast.error(data?.error || 'Nie udało się cofnąć serduszka');
      }
    } catch (error) {
      console.error('Unlike error:', error);
    }
  };

  const handleEditCaption = async (photoId: string, newCaptionText: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo || photo.uploadedBy !== currentUserId) {
      toast.error('Tylko autor może edytować podpis');
      return;
    }

    try {
      // Dla lokalnych zdjęć edytujemy klientowo.
      if (photo.id.startsWith('local-')) {
        onPhotosChange(photos.map((p) =>
          p.id === photoId ? { ...p, caption: newCaptionText || null } : p
        ));
        setEditingCaption(null);
        toast.success('Podpis został zaktualizowany');
        return;
      }

      const response = await fetch(`/api/trips/${tripId}/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: newCaptionText || null }),
      });

      if (response.ok) {
        const updatedPhoto = await response.json();
        onPhotosChange(photos.map(p => p.id === photoId ? updatedPhoto : p));
        setSelectedPhoto(updatedPhoto);
        void refreshPhotos();
        setEditingCaption(null);
        toast.success('Podpis został zaktualizowany');
      } else {
        const data = await response.json().catch(() => null);
        toast.error(data?.error || 'Nie udało się edytować podpisu');
      }
    } catch (error) {
      console.error('Edit caption error:', error);
      toast.error('Nie udało się edytować podpisu');
    }
  };

  const handleCreateShareLink = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/gallery/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttlDays: Number(shareTtlDays) }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error || 'Nie udało się utworzyć linku udostępniania');
        return;
      }

      setShareUrl(data.url);
      void refreshShareLinks();
      toast.success('Link udostępniania został utworzony');
    } catch (error) {
      console.error('Share link error:', error);
      toast.error('Nie udało się utworzyć linku udostępniania');
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Skopiowano link do schowka');
    } catch {
      toast.error('Nie udało się skopiować linku');
    }
  };

  const handleRevokeShareLink = async (shareId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/gallery/share/${shareId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error || 'Nie udało się cofnąć linku');
        return;
      }

      setShareLinks((prev) => prev.filter((link) => link.id !== shareId));
      toast.success('Link został cofnięty');
    } catch {
      toast.error('Nie udało się cofnąć linku');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Galeria zdjęć ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Opis (opcjonalnie)</Label>
              <Input
                placeholder="Dodaj opis do zdjęć..."
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
              />
            </div>
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <input
                type="file"
                id="photo-upload"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className={`h-8 w-8 ${uploading ? 'animate-bounce' : ''}`} />
                <p className="text-sm font-medium">
                  {uploading ? 'Przesyłanie...' : 'Kliknij aby dodać zdjęcia'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Obsługiwane formaty: JPG, PNG, WebP
                </p>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery tools */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <div className="flex gap-2">
              <select
                value={shareTtlDays}
                onChange={(e) => setShareTtlDays(e.target.value as "0" | "1" | "7" | "30")}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="0">Bez terminu</option>
                <option value="1">Wygasa za 1 dzień</option>
                <option value="7">Wygasa za 7 dni</option>
                <option value="30">Wygasa za 30 dni</option>
              </select>
              <Button type="button" variant="outline" size="sm" onClick={handleCreateShareLink}>
                <Share2 className="h-4 w-4 mr-2" />
                Udostępnij galerię
              </Button>
              {shareUrl && (
                <Button type="button" variant="outline" size="sm" onClick={handleCopyShareLink}>
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Skopiowano' : 'Kopiuj link'}
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Szukaj po opisie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-56"
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
          </div>

          {shareUrl && (
            <div className="text-xs text-muted-foreground break-all">
              Link: {shareUrl}
            </div>
          )}

          {shareLinks.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Aktywne linki:</p>
              {shareLinks.map((link) => (
                <div key={link.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded border p-2">
                  <div className="text-xs text-muted-foreground break-all">
                    {link.url}
                    <div>
                      {link.expiresAt ? `Wygasa: ${format(new Date(link.expiresAt), 'd MMM yyyy HH:mm', { locale: pl })}` : 'Bez terminu'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(link.url);
                        toast.success('Skopiowano link do schowka');
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Kopiuj
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeShareLink(link.id)}
                    >
                      Cofnij
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo grid */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <Card
              key={photo.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="aspect-square relative bg-muted">
                <img
                  src={photo.url}
                  alt={photo.caption || 'Zdjęcie z wyjazdu'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {photo.likes}
                  </Badge>
                </div>
              </div>
              {photo.caption && (
                <CardContent className="p-2">
                  <p className="text-xs truncate">{photo.caption}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Brak zdjęć</p>
            <p className="text-sm mt-1">Dodaj pierwsze zdjęcie z wyjazdu!</p>
          </CardContent>
        </Card>
      )}

      {/* Lightbox dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl">
            <VisuallyHidden>
              <DialogTitle>Podgląd zdjęcia</DialogTitle>
            </VisuallyHidden>
            <div className="space-y-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Podgląd zdjęcia z wyjazdu'}
                className="w-full rounded-lg"
              />
              <div className="space-y-3">
                {editingCaption === selectedPhoto.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editCaptionText}
                      onChange={(e) => setEditCaptionText(e.target.value)}
                      placeholder="Wpisz nowy podpis..."
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleEditCaption(selectedPhoto.id, editCaptionText)}
                    >
                      Zapisz
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCaption(null)}
                    >
                      Anuluj
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      {selectedPhoto.caption && (
                        <p className="font-medium">{selectedPhoto.caption}</p>
                      )}
                    </div>
                    {selectedPhoto.uploadedBy === currentUserId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCaption(selectedPhoto.id);
                          setEditCaptionText(selectedPhoto.caption || "");
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {selectedPhoto.uploadedByName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(selectedPhoto.createdAt), 'd MMM yyyy', { locale: pl })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPhoto.likedByMe ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlikePhoto(selectedPhoto.id);
                        }}
                      >
                        <Heart className="h-4 w-4 mr-1 fill-red-500 text-red-500" />
                        {selectedPhoto.likes}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikePhoto(selectedPhoto.id);
                        }}
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        {selectedPhoto.likes}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(selectedPhoto.url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {selectedPhoto.uploadedBy === currentUserId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePhoto(selectedPhoto.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
