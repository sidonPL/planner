'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  maxSizeMB?: number;
  aspectRatio?: number | 'video' | 'square';
  folder?: string;
  placeholder?: string;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  maxSizeMB = 5,
  aspectRatio,
  folder: _folder = 'misc',
  placeholder: _placeholder = 'Dodaj zdjęcie',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Plik musi być obrazem');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`Plik jest za duży. Maksymalny rozmiar: ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onChange(data.url);
      toast.success('Zdjęcie zostało przesłane');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Nie udało się przesłać zdjęcia');
      setPreview(value || null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (onRemove) {
      onRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Zdjęcie zostało usunięte');
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {preview ? (
        <div className="relative group">
          <div
            className="relative w-full rounded-lg overflow-hidden border-2 border-border bg-muted"
            style={{
              aspectRatio: aspectRatio || 'auto',
              maxHeight: '300px'
            }}
          >
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={handleRemove}
              disabled={uploading || disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading || disabled}
          className="w-full rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted transition-colors p-8 text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            )}
            <div className="text-sm text-muted-foreground">
              {uploading ? (
                <p>Przesyłanie...</p>
              ) : (
                <>
                  <p className="font-medium">Kliknij aby dodać zdjęcie</p>
                  <p className="text-xs mt-1">PNG, JPG, WEBP do {maxSizeMB}MB</p>
                </>
              )}
            </div>
            {!uploading && (
              <Upload className="h-5 w-5 text-muted-foreground mt-2" />
            )}
          </div>
        </button>
      )}
    </div>
  );
}

