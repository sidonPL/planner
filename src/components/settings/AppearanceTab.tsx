'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Monitor, Save, Volume2, VolumeX, Bell } from 'lucide-react';
import { toast } from 'sonner';
import type { UserSettings } from '@prisma/client';
import { ThemeSelector } from '@/components/gamification/ThemeSelector';
import { Separator } from '@/components/ui/separator';

interface AppearanceTabProps {
  userSettings: UserSettings | null | undefined;
}

type NotificationCategories = {
  tasks: boolean;
  events: boolean;
  reminders: boolean;
  gamification: boolean;
  household: boolean;
  inventory: boolean;
};

const defaultNotificationCategories: NotificationCategories = {
  tasks: true,
  events: true,
  reminders: true,
  gamification: true,
  household: true,
  inventory: true,
};

function isNotificationCategories(value: unknown): value is Partial<NotificationCategories> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === 'boolean');
}

export function AppearanceTab({ userSettings }: AppearanceTabProps) {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState(userSettings?.fontSize || 'medium');
  const [soundEnabled, setSoundEnabled] = useState(userSettings?.soundEnabled ?? true);
  const [language, setLanguage] = useState('pl');
  const [saving, setSaving] = useState(false);
  const [notificationCategories, setNotificationCategories] = useState<NotificationCategories>(() => {
    // Załaduj z localStorage lub userSettings
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notificationCategories');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as unknown;
          if (isNotificationCategories(parsed)) {
            return { ...defaultNotificationCategories, ...parsed };
          }
        } catch {
          // ...
        }
      }
    }
    // Fallback z userSettings lub domyślne
    const settingsWithNotifications = userSettings as (UserSettings & {
      notificationCategories?: unknown;
    }) | null | undefined;

    if (isNotificationCategories(settingsWithNotifications?.notificationCategories)) {
      return {
        ...defaultNotificationCategories,
        ...settingsWithNotifications.notificationCategories,
      };
    }

    return defaultNotificationCategories;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fontSize,
          soundEnabled,
          notificationCategories,
        }),
      });

      if (response.ok) {
        // Zapisz kategorie powiadomień w localStorage
        localStorage.setItem('notificationCategories', JSON.stringify(notificationCategories));
        toast.success('Ustawienia wyglądu i powiadomień zapisane');

        // Apply font size to document
        document.documentElement.style.fontSize =
          fontSize === 'small' ? '14px' :
          fontSize === 'large' ? '18px' : '16px';
      } else {
        toast.error('Nie udało się zapisać ustawień');
      }
    } catch {
      toast.error('Wystąpił błąd');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Motyw */}
      <Card>
        <CardHeader>
          <CardTitle>Motyw aplikacji</CardTitle>
          <CardDescription>
            Wybierz jasny, ciemny lub automatyczny motyw
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                theme === 'light'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Sun className="h-8 w-8" />
              <span className="text-sm font-medium">Jasny</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Moon className="h-8 w-8" />
              <span className="text-sm font-medium">Ciemny</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                theme === 'system'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Monitor className="h-8 w-8" />
              <span className="text-sm font-medium">Auto</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Separator */}
      <Separator className="my-6" />

      {/* Motywy Kolorystyczne (Gamifikacja) */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Motywy Kolorystyczne</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Odblokowuj nowe motywy w sklepie nagród gamifikacji!
        </p>
        <ThemeSelector />
      </div>

      {/* Separator */}
      <Separator className="my-6" />

      {/* Rozmiar czcionki */}
      <Card>
        <CardHeader>
          <CardTitle>Rozmiar czcionki</CardTitle>
          <CardDescription>
            Dostosuj rozmiar tekstu w aplikacji
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Mały (14px)</SelectItem>
              <SelectItem value="medium">Średni (16px)</SelectItem>
              <SelectItem value="large">Duży (18px)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Przykład tekstu w wybranym rozmiarze: Lorem ipsum dolor sit amet.
          </p>
        </CardContent>
      </Card>

      {/* Dźwięki */}
      <Card>
        <CardHeader>
          <CardTitle>Dźwięki interfejsu</CardTitle>
          <CardDescription>
            Włącz lub wyłącz dźwięki w aplikacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="sound">Dźwięki UI</Label>
                <p className="text-sm text-muted-foreground">
                  Dźwięki przy klikaniu, powiadomieniach itp.
                </p>
              </div>
            </div>
            <Switch
              id="sound"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Język (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Język interfejsu</CardTitle>
          <CardDescription>
            Wybierz preferowany język aplikacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={setLanguage} disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pl">Polski 🇵🇱</SelectItem>
              <SelectItem value="en">English 🇬🇧</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            💡 Zmiana języka będzie dostępna wkrótce
          </p>
        </CardContent>
      </Card>

      {/* Separator */}
      <Separator className="my-6" />

      {/* Kategorie powiadomień */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Kategorie powiadomień
          </CardTitle>
          <CardDescription>
            Wybierz które kategorie powiadomień chcesz widzieć
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="divide-y">
            {/* Zadania */}
            <div className="flex items-start justify-between py-4 first:pt-0">
              <div className="flex-1">
                <Label htmlFor="tasks" className="text-base font-medium">Zadania</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Powiadomienia o zadaniach domowych
                </p>
              </div>
              <Switch
                id="tasks"
                checked={notificationCategories.tasks}
                onCheckedChange={(checked) =>
                  setNotificationCategories({ ...notificationCategories, tasks: checked })
                }
                className="ml-4 mt-1"
              />
            </div>

            {/* Wydarzenia */}
            <div className="flex items-start justify-between py-4">
              <div className="flex-1">
                <Label htmlFor="events" className="text-base font-medium">Wydarzenia</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Powiadomienia o zbliżających się wydarzeniach
                </p>
              </div>
              <Switch
                id="events"
                checked={notificationCategories.events}
                onCheckedChange={(checked) =>
                  setNotificationCategories({ ...notificationCategories, events: checked })
                }
                className="ml-4 mt-1"
              />
            </div>

            {/* Przypomnienia */}
            <div className="flex items-start justify-between py-4">
              <div className="flex-1">
                <Label htmlFor="reminders" className="text-base font-medium">Przypomnienia</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Przypomnienia o ważnych terminach
                </p>
              </div>
              <Switch
                id="reminders"
                checked={notificationCategories.reminders}
                onCheckedChange={(checked) =>
                  setNotificationCategories({ ...notificationCategories, reminders: checked })
                }
                className="ml-4 mt-1"
              />
            </div>

            {/* Gamifikacja */}
            <div className="flex items-start justify-between py-4">
              <div className="flex-1">
                <Label htmlFor="gamification" className="text-base font-medium">Gamifikacja</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Osiągnięcia, poziomy, questy
                </p>
              </div>
              <Switch
                id="gamification"
                checked={notificationCategories.gamification}
                onCheckedChange={(checked) =>
                  setNotificationCategories({ ...notificationCategories, gamification: checked })
                }
                className="ml-4 mt-1"
              />
            </div>

            {/* Gospodarstwo */}
            <div className="flex items-start justify-between py-4">
              <div className="flex-1">
                <Label htmlFor="household" className="text-base font-medium">Gospodarstwo</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Zdarzenia w gospodarstwie
                </p>
              </div>
              <Switch
                id="household"
                checked={notificationCategories.household}
                onCheckedChange={(checked) =>
                  setNotificationCategories({ ...notificationCategories, household: checked })
                }
                className="ml-4 mt-1"
              />
            </div>

            {/* Inwentarz */}
            <div className="flex items-start justify-between py-4">
              <div className="flex-1">
                <Label htmlFor="inventory" className="text-base font-medium">Inwentarz</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Powiadomienia o niskich zapasach i wygasających produktach
                </p>
              </div>
              <Switch
                id="inventory"
                checked={notificationCategories.inventory}
                onCheckedChange={(checked) =>
                  setNotificationCategories({ ...notificationCategories, inventory: checked })
                }
                className="ml-4 mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
      </div>
    </div>
  );
}

