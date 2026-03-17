"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Save } from "lucide-react";

interface NotificationSettings {
  enabled: boolean;
  frequency: "daily" | "every3days" | "weekly";
  types: {
    lowStock: boolean;
    expiringSoon: boolean;
    expired: boolean;
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  frequency: "daily",
  types: {
    lowStock: true,
    expiringSoon: true,
    expired: true,
  },
};

interface InventoryNotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryNotificationSettings({
  open,
  onOpenChange,
}: InventoryNotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  // Załaduj ustawienia z localStorage
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem("inventory-notification-settings");
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Error loading notification settings:", error);
      }
    };

    loadSettings();
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem("inventory-notification-settings", JSON.stringify(settings));
      toast.success("Ustawienia powiadomień zapisane");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Nie udało się zapisać ustawień");
    }
  };

  const frequencyLabels = {
    daily: "Codziennie",
    every3days: "Co 3 dni",
    weekly: "Raz w tygodniu",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Ustawienia Powiadomień
          </DialogTitle>
          <DialogDescription>
            Skonfiguruj powiadomienia o stanie inwentarza
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Włącz/wyłącz powiadomienia */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications-enabled" className="text-base">
                Powiadomienia
              </Label>
              <p className="text-sm text-muted-foreground">
                Włącz lub wyłącz wszystkie powiadomienia
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enabled: checked })
              }
            />
          </div>

          {/* Częstotliwość */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Częstotliwość sprawdzania</Label>
            <Select
              value={settings.frequency}
              onValueChange={(value: "daily" | "every3days" | "weekly") =>
                setSettings({ ...settings, frequency: value })
              }
              disabled={!settings.enabled}
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Codziennie</SelectItem>
                <SelectItem value="every3days">Co 3 dni</SelectItem>
                <SelectItem value="weekly">Raz w tygodniu</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sprawdzanie: {frequencyLabels[settings.frequency]}
            </p>
          </div>

          {/* Typy powiadomień */}
          <div className="space-y-3">
            <Label>Typy powiadomień</Label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-low-stock" className="font-normal">
                    Niskie zapasy
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Gdy ilość ≤ minimum
                  </p>
                </div>
                <Switch
                  id="notify-low-stock"
                  checked={settings.types.lowStock}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      types: { ...settings.types, lowStock: checked },
                    })
                  }
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-expiring" className="font-normal">
                    Wygasające wkrótce
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Produkty wygasające w ciągu 3 dni
                  </p>
                </div>
                <Switch
                  id="notify-expiring"
                  checked={settings.types.expiringSoon}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      types: { ...settings.types, expiringSoon: checked },
                    })
                  }
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-expired" className="font-normal">
                    Przeterminowane
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Produkty po dacie ważności
                  </p>
                </div>
                <Switch
                  id="notify-expired"
                  checked={settings.types.expired}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      types: { ...settings.types, expired: checked },
                    })
                  }
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          {/* Info */}
          {!settings.enabled && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Powiadomienia są wyłączone
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Zapisz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

