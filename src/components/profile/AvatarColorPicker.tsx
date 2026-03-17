'use client';

import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  { name: 'Czerwony', value: '#EF4444' },
  { name: 'Pomarańczowy', value: '#F97316' },
  { name: 'Żółty', value: '#EAB308' },
  { name: 'Zielony', value: '#22C55E' },
  { name: 'Cyjan', value: '#06B6D4' },
  { name: 'Niebieski', value: '#3B82F6' },
  { name: 'Indygo', value: '#6366F1' },
  { name: 'Fioletowy', value: '#A855F7' },
  { name: 'Różowy', value: '#EC4899' },
  { name: 'Szary', value: '#6B7280' },
];

interface AvatarColorPickerProps {
  currentColor?: string | null;
  onColorChange?: (color: string) => void;
}

export function AvatarColorPicker({ currentColor, onColorChange }: AvatarColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(currentColor || '#3B82F6');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/user/avatar-color', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: selectedColor }),
      });

      if (response.ok) {
        toast.success('Kolor avatara zapisany!');
        setOpen(false);
        onColorChange?.(selectedColor);
        // Refresh page to see changes
        setTimeout(() => window.location.reload(), 500);
      } else {
        toast.error('Nie udało się zapisać koloru');
      }
    } catch (error) {
      console.error('Error saving avatar color:', error);
      toast.error('Wystąpił błąd');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette className="h-4 w-4 mr-2" />
          Zmień Kolor Avatara
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🎨 Wybierz Kolor Avatara</DialogTitle>
          <DialogDescription>
            Wybierz kolor, który będzie używany w Twoim avatarze
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-3 py-4">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={cn(
                'relative h-12 rounded-lg border-2 transition-all hover:scale-110',
                selectedColor === color.value
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border'
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {selectedColor === color.value && (
                <Check className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <div
            className="h-12 w-12 rounded-full border-2 border-border"
            style={{ backgroundColor: selectedColor }}
          />
          <div className="text-sm">
            <div className="font-medium">Podgląd</div>
            <div className="text-muted-foreground">
              {AVATAR_COLORS.find(c => c.value === selectedColor)?.name || 'Niestandardowy'}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

