'use client';

import { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setIsUploading(true);
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
      } catch (error) {
        console.error('Error uploading image:', error);
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
  }, [onRemove, onChange]);

  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border">
          <Image
            src={value}
            alt="Upload preview"
            fill
            className="object-cover"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <div className="mt-4">
            <label htmlFor="image-upload">
              <Button
                type="button"
                variant="outline"
                disabled={disabled || isUploading}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                {isUploading ? 'Uploading...' : 'Choose Image'}
              </Button>
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={disabled || isUploading}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            PNG, JPG, GIF up to 10MB
          </p>
        </div>
      )}
    </div>
  );
}

