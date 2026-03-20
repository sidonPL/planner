'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  ArrowLeft,
  Save,
  Mail,
  Key,
  Globe,
  Zap,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

export function AdminSettingsClient() {
  const [saving, setSaving] = useState(false);

  // General Settings
  const [appName, setAppName] = useState('Planner');
  const [appUrl, setAppUrl] = useState('http://localhost:3000');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Email Settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [emailFrom, setEmailFrom] = useState('');

  // Feature Flags
  const [enableGamification, setEnableGamification] = useState(true);
  const [enableCalendarSync, setEnableCalendarSync] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableRealtime, setEnableRealtime] = useState(false);

  // API Keys (masked)
  const [pusherKey, setPusherKey] = useState('***************');
  const [googleApiKey, setGoogleApiKey] = useState('***************');
  const [openAiKey, setOpenAiKey] = useState('***************');

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          appUrl,
          maintenanceMode,
        }),
      });

      if (response.ok) {
        toast.success('Ustawienia ogólne zapisane!');
      } else {
        toast.error('Błąd zapisywania');
      }
    } catch {
      toast.error('Błąd połączenia');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort: parseInt(smtpPort),
          smtpUser,
          smtpPass,
          emailFrom,
        }),
      });

      if (response.ok) {
        toast.success('Ustawienia email zapisane!');
      } else {
        toast.error('Błąd zapisywania');
      }
    } catch {
      toast.error('Błąd połączenia');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableGamification,
          enableCalendarSync,
          enableNotifications,
          enableRealtime,
        }),
      });

      if (response.ok) {
        toast.success('Feature flags zapisane!');
      } else {
        toast.error('Błąd zapisywania');
      }
    } catch {
      toast.error('Błąd połączenia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8 text-gray-500" />
              Ustawienia Systemowe
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Konfiguracja aplikacji i integracji
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Ogólne
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Bezpieczeństwo
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Podstawowe ustawienia</CardTitle>
              <CardDescription>Ogólna konfiguracja aplikacji</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appName">Nazwa aplikacji</Label>
                <Input
                  id="appName"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Planner"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appUrl">URL aplikacji</Label>
                <Input
                  id="appUrl"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://planner.example.com"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance">Tryb konserwacji</Label>
                  <p className="text-sm text-muted-foreground">
                    Wyłącz dostęp dla użytkowników (tylko admin)
                  </p>
                </div>
                <Switch
                  id="maintenance"
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>
              <Button onClick={handleSaveGeneral} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Konfiguracja SMTP</CardTitle>
              <CardDescription>Ustawienia serwera pocztowego</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Host SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port</Label>
                  <Input
                    id="smtpPort"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Użytkownik</Label>
                  <Input
                    id="smtpUser"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="noreply@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPass">Hasło</Label>
                  <Input
                    id="smtpPass"
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailFrom">Email nadawcy</Label>
                <Input
                  id="emailFrom"
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                  placeholder="Planner <noreply@example.com>"
                />
              </div>
              <Button onClick={handleSaveEmail} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Włącz/wyłącz funkcje</CardTitle>
              <CardDescription>
                Zarządzaj dostępnością funkcji w aplikacji
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="gamification">Gamifikacja</Label>
                  <p className="text-sm text-muted-foreground">
                    XP, poziomy, osiągnięcia, questy
                  </p>
                </div>
                <Switch
                  id="gamification"
                  checked={enableGamification}
                  onCheckedChange={setEnableGamification}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="calendarSync">Synchronizacja kalendarza</Label>
                  <p className="text-sm text-muted-foreground">
                    Google Calendar, Outlook integration
                  </p>
                </div>
                <Switch
                  id="calendarSync"
                  checked={enableCalendarSync}
                  onCheckedChange={setEnableCalendarSync}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Powiadomienia</Label>
                  <p className="text-sm text-muted-foreground">
                    Push notifications, email alerts
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={enableNotifications}
                  onCheckedChange={setEnableNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="realtime">Real-time updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Pusher WebSockets (wymaga konfiguracji)
                  </p>
                </div>
                <Switch
                  id="realtime"
                  checked={enableRealtime}
                  onCheckedChange={setEnableRealtime}
                />
              </div>
              <Button onClick={handleSaveFeatures} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Zapisywanie...' : 'Zapisz feature flags'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Klucze API</CardTitle>
              <CardDescription>
                Konfiguracja integracji z zewnętrznymi serwisami
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pusherKey">Pusher API Key</Label>
                <Input
                  id="pusherKey"
                  value={pusherKey}
                  onChange={(e) => setPusherKey(e.target.value)}
                  placeholder="Wprowadź klucz Pusher"
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="googleApi">Google API Key</Label>
                <Input
                  id="googleApi"
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  placeholder="Wprowadź klucz Google"
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openaiKey">OpenAI API Key</Label>
                <Input
                  id="openaiKey"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="Wprowadź klucz OpenAI"
                  type="password"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                💡 Klucze są przechowywane w zmiennych środowiskowych (.env)
              </p>
              <Button disabled>
                <Save className="mr-2 h-4 w-4" />
                Zapisz klucze (TODO)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bezpieczeństwo</CardTitle>
              <CardDescription>Ustawienia zabezpieczeń aplikacji</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Wymuszaj 2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    Wymagaj dwuskładnikowej autoryzacji dla wszystkich
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-logout po</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatyczne wylogowanie po braku aktywności
                  </p>
                </div>
                <Input type="number" placeholder="30" className="w-20" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Rate limiting</Label>
                  <p className="text-sm text-muted-foreground">
                    Maksymalna liczba requestów na minutę
                  </p>
                </div>
                <Input type="number" placeholder="100" className="w-20" />
              </div>
              <Button disabled>
                <Save className="mr-2 h-4 w-4" />
                Zapisz ustawienia (TODO)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

