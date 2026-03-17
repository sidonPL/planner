'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSoundEffects } from '@/lib/sound-effects';

/**
 * Komponent ustawień dźwięków gamifikacji
 * Pozwala włączyć/wyłączyć dźwięki i kontrolować głośność
 */
export function SoundSettings() {
  const { isEnabled, setEnabled, getVolume, setVolume } = useSoundEffects();
  const [enabled, setEnabledState] = useState(false);
  const [volume, setVolumeState] = useState(50);

  useEffect(() => {
    // Load current settings on mount
    const loadSettings = () => {
      setEnabledState(isEnabled());
      setVolumeState(Math.round(getVolume() * 100));
    };

    loadSettings();
  }, [isEnabled, getVolume]);

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    setEnabledState(checked);
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0] / 100;
    setVolume(vol);
    setVolumeState(value[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? (
            <Volume2 className="h-5 w-5 text-blue-500" />
          ) : (
            <VolumeX className="h-5 w-5 text-muted-foreground" />
          )}
          Efekty Dźwiękowe
        </CardTitle>
        <CardDescription>
          Kontroluj dźwięki w systemie gamifikacji
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-enabled">Włącz dźwięki</Label>
            <p className="text-sm text-muted-foreground">
              Odtwarzaj dźwięki przy ukończeniu zadań i osiągnięciach
            </p>
          </div>
          <Switch
            id="sound-enabled"
            checked={enabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        {/* Volume Slider */}
        {enabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-volume">Głośność</Label>
              <span className="text-sm text-muted-foreground">
                {volume}%
              </span>
            </div>
            <Slider
              id="sound-volume"
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Ustaw głośność efektów dźwiękowych (0-100%)
            </p>
          </div>
        )}

        {/* Preview Sounds */}
        {enabled && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Testuj dźwięki:</p>
            <div className="grid grid-cols-2 gap-2">
              <PreviewButton soundType="task-complete" label="Zadanie" />
              <PreviewButton soundType="achievement-unlock" label="Osiągnięcie" />
              <PreviewButton soundType="xp-earn" label="XP" />
              <PreviewButton soundType="quest-complete" label="Quest" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Przycisk do testowania dźwięków
 */
function PreviewButton({
  soundType,
  label
}: {
  soundType: 'task-complete' | 'achievement-unlock' | 'xp-earn' | 'quest-complete';
  label: string
}) {
  const { playSound } = useSoundEffects();

  return (
    <button
      onClick={() => playSound(soundType)}
      className="px-3 py-2 text-sm rounded-md border bg-secondary hover:bg-secondary/80 transition-colors"
    >
      🔊 {label}
    </button>
  );
}

