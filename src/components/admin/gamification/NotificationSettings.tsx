'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save, Bell } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    levelUpNotifications: true,
    achievementNotifications: true,
    questNotifications: true,
    badgeNotifications: true,
    browserNotifications: true,
    emailNotifications: false,
    soundAlerts: true,
  });

  const handleSave = async () => {
    try {
      const response = await fetch('/api/admin/gamification/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Ustawienia zapisane!');
      } else {
        toast.error('Błąd zapisywania');
      }
    } catch (error) {
      toast.error('Błąd połączenia');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Ustawienia Powiadomień
        </CardTitle>
        <CardDescription>
          Skonfiguruj globalne ustawienia powiadomień dla całego systemu
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="font-semibold">Typy powiadomień</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="levelUp">Awans poziomu</Label>
              <p className="text-sm text-muted-foreground">
                Powiadomienia o awansie na wyższy poziom
              </p>
            </div>
            <Switch
              id="levelUp"
              checked={settings.levelUpNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, levelUpNotifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="achievement">Osiągnięcia</Label>
              <p className="text-sm text-muted-foreground">
                Powiadomienia o odblokowaniu osiągnięć
              </p>
            </div>
            <Switch
              id="achievement"
              checked={settings.achievementNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, achievementNotifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="quest">Daily Quests</Label>
              <p className="text-sm text-muted-foreground">
                Powiadomienia o ukończeniu questów
              </p>
            </div>
            <Switch
              id="quest"
              checked={settings.questNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, questNotifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="badge">Odznaki</Label>
              <p className="text-sm text-muted-foreground">
                Powiadomienia o zdobyciu odznak
              </p>
            </div>
            <Switch
              id="badge"
              checked={settings.badgeNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, badgeNotifications: checked })
              }
            />
          </div>
        </div>

        {/* Delivery Methods */}
        <div className="space-y-4">
          <h3 className="font-semibold">Kanały dostarczania</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser">Powiadomienia przeglądarki</Label>
              <p className="text-sm text-muted-foreground">
                Natywne powiadomienia w przeglądarce
              </p>
            </div>
            <Switch
              id="browser"
              checked={settings.browserNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, browserNotifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email">Email</Label>
              <p className="text-sm text-muted-foreground">
                Powiadomienia email (wymaga konfiguracji)
              </p>
            </div>
            <Switch
              id="email"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, emailNotifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound">Dźwięki</Label>
              <p className="text-sm text-muted-foreground">
                Alerty dźwiękowe przy powiadomieniach
              </p>
            </div>
            <Switch
              id="sound"
              checked={settings.soundAlerts}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, soundAlerts: checked })
              }
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Zapisz ustawienia
        </Button>
      </CardContent>
    </Card>
  );
}

