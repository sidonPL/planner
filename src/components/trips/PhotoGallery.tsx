"use client";

import { useState } from "react";
import { Upload, X, Image as ImageIcon, Calendar, User, Heart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface TripPhoto {
  id: string;
  tripId: string;
  url: string;
  caption: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: Date;
  likes: number;
}

interface PhotoGalleryProps {
  tripId: string;
  photos: TripPhoto[];
  currentUserId: string;
  onPhotosChange: (photos: TripPhoto[]) => void;
}

export function PhotoGallery({ tripId, photos, currentUserId, onPhotosChange }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<TripPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newCaption, setNewCaption] = useState("");

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
        setNewCaption("");
        toast.success(`Dodano ${files.length} zdjęć`);
      } else {
        toast.error('Nie udało się przesłać zdjęć');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Wystąpił błąd podczas przesyłania');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to zdjęcie?')) return;

    try {
      const response = await fetch(`/api/trips/${tripId}/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onPhotosChange(photos.filter(p => p.id !== photoId));
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
    try {
      const response = await fetch(`/api/trips/${tripId}/photos/${photoId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const updatedPhoto = await response.json();
        onPhotosChange(photos.map(p => p.id === photoId ? updatedPhoto : p));
      }
    } catch (error) {
      console.error('Like error:', error);
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

      {/* Photo grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
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
            <div className="space-y-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Zdjęcie'}
                className="w-full rounded-lg"
              />
              <div className="space-y-2">
                {selectedPhoto.caption && (
                  <p className="font-medium">{selectedPhoto.caption}</p>
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
