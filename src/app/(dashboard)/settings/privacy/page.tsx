'use client';

import { useState } from 'react';
import { Download, Trash2, ShieldAlert, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';

export default function PrivacyPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleExportData = async () => {
    try {
      setIsExporting(true);

      const response = await fetch('/api/user/export');

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `family-planner-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Dane zostały wyeksportowane!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Nie udało się wyeksportować danych');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      toast.error('Wpisz poprawny tekst potwierdzenia');
      return;
    }

    if (!password) {
      toast.error('Podaj hasło');
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      toast.success('Konto zostało usunięte');

      // Sign out and redirect
      setTimeout(() => {
        signOut({ callbackUrl: '/' });
      }, 1000);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Nie udało się usunąć konta');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Prywatność i Dane</h1>
        <p className="text-muted-foreground mt-2">
          Zarządzaj swoimi danymi osobowymi i ustawieniami prywatności
        </p>
      </div>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            <CardTitle>Eksport Danych</CardTitle>
          </div>
          <CardDescription>
            Pobierz kopię wszystkich swoich danych w formacie JSON zgodnie z RODO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium mb-2">Eksport zawiera:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Profil użytkownika</li>
              <li>• Wszystkie zadania (stworzone i przypisane)</li>
              <li>• Przepisy i ulubione</li>
              <li>• Harmonogramy i wyjątki</li>
              <li>• Planowane posiłki</li>
              <li>• Transakcje finansowe</li>
              <li>• Wydarzenia kalendarzowe</li>
              <li>• Powiadomienia</li>
              <li>• Odznaki i osiągnięcia</li>
              <li>• Komentarze</li>
              <li>• Historia obecności (ostatnie 100 wpisów)</li>
            </ul>
          </div>

          <Button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Eksportowanie...' : 'Pobierz Moje Dane'}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Strefa Niebezpieczna</CardTitle>
          </div>
          <CardDescription>
            Nieodwracalne akcje dotyczące Twojego konta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <h4 className="font-medium text-destructive mb-2">⚠️ Uwaga!</h4>
            <p className="text-sm text-muted-foreground">
              Usunięcie konta jest <strong>nieodwracalne</strong>.
              Wszystkie Twoje dane zostaną trwale usunięte z naszych serwerów.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń Moje Konto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ta akcja jest nieodwracalna. Wszystkie Twoje dane zostaną trwale usunięte.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Hasło</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Wpisz swoje hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">
                    Wpisz <code className="text-sm bg-muted px-1 py-0.5 rounded">DELETE MY ACCOUNT</code> aby potwierdzić
                  </Label>
                  <Input
                    id="confirm"
                    type="text"
                    placeholder="DELETE MY ACCOUNT"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setPassword('');
                  setConfirmText('');
                }}>
                  Anuluj
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmText !== 'DELETE MY ACCOUNT'}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Usuwanie...' : 'Usuń Konto'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* GDPR Information */}
      <Card>
        <CardHeader>
          <CardTitle>Twoje Prawa RODO</CardTitle>
          <CardDescription>
            Informacja o przetwarzaniu danych osobowych
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Zgodnie z RODO masz prawo do:</strong></p>
            <ul className="space-y-1 ml-4">
              <li>✅ Dostępu do swoich danych (eksport powyżej)</li>
              <li>✅ Sprostowania nieprawidłowych danych (edycja profilu)</li>
              <li>✅ Usunięcia danych (usunięcie konta)</li>
              <li>✅ Przenoszenia danych (eksport JSON)</li>
              <li>✅ Sprzeciwu wobec przetwarzania</li>
              <li>✅ Ograniczenia przetwarzania</li>
            </ul>

            <p className="mt-4">
              <strong>Administrator danych:</strong> Family Planner
            </p>
            <p>
              <strong>Kontakt:</strong> privacy@familyplanner.app
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

