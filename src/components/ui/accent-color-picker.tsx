"use client";

import { Check } from "lucide-react";
import { useAccentColor, accentColors, AccentColorName } from "@/hooks/useAccentColor";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface AccentColorPickerProps {
  className?: string;
}

export function AccentColorPicker({ className }: AccentColorPickerProps) {
  const { accentColor, setAccentColor, isLoading } = useAccentColor();

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>Kolor akcentu</Label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Kolor akcentu</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Wybierz kolor, który będzie używany jako główny kolor interfejsu
      </p>
      <div className="flex flex-wrap gap-2">
        {accentColors.map((color) => (
          <button
            key={color.name}
            type="button"
            onClick={() => setAccentColor(color.name as AccentColorName)}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center",
              accentColor === color.name
                ? "border-foreground scale-110"
                : "border-transparent"
            )}
            style={{ backgroundColor: color.hex }}
            title={color.label}
          >
            {accentColor === color.name && (
              <Check className="h-4 w-4 text-white" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

