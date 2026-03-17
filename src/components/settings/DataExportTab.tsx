'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3, FileJson, FileSpreadsheet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DataExportTabProps {
  userId: string;
}

interface UserStats {
  tasksCompleted: number;
  recipesCreated: number;
  eventsCreated: number;
  xpEarned: number;
  level: number;
  daysActive: number;
}

export function DataExportTab({ userId }: DataExportTabProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleExport = async (type: 'recipes' | 'tasks' | 'events' | 'all', format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const response = await fetch(`/api/user/export?type=${type}&format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planner-${type}-export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Wyeksportowano dane: ${type}`);
      } else {
        toast.error('Nie udało się wyeksportować danych');
      }
    } catch (error) {
      toast.error('Wystąpił błąd');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Statystyki */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Twoje statystyki
          </CardTitle>
          <CardDescription>
            Podsumowanie Twojej aktywności w aplikacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : stats ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Zadania ukończone</p>
                <p className="text-2xl font-bold">{stats.tasksCompleted}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Przepisy dodane</p>
                <p className="text-2xl font-bold">{stats.recipesCreated}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Wydarzenia</p>
                <p className="text-2xl font-bold">{stats.eventsCreated}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">XP zdobyte</p>
                <p className="text-2xl font-bold">{stats.xpEarned}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Poziom</p>
                <p className="text-2xl font-bold">{stats.level}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Dni aktywności</p>
                <p className="text-2xl font-bold">{stats.daysActive}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Brak danych statystycznych
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export danych */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Eksport danych
          </CardTitle>
          <CardDescription>
            Pobierz swoje dane w różnych formatach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Przepisy */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Przepisy</p>
              <p className="text-sm text-muted-foreground">
                Wszystkie Twoje przepisy z składnikami i instrukcjami
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('recipes', 'json')}
                disabled={exporting}
              >
                <FileJson className="mr-2 h-4 w-4" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('recipes', 'csv')}
                disabled={exporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>

          {/* Zadania */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Zadania</p>
              <p className="text-sm text-muted-foreground">
                Twoje zadania, status i daty realizacji
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('tasks', 'json')}
                disabled={exporting}
              >
                <FileJson className="mr-2 h-4 w-4" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('tasks', 'csv')}
                disabled={exporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>

          {/* Wydarzenia */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Wydarzenia</p>
              <p className="text-sm text-muted-foreground">
                Kalendarz wydarzeń i spotkań
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('events', 'json')}
                disabled={exporting}
              >
                <FileJson className="mr-2 h-4 w-4" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('events', 'csv')}
                disabled={exporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>

          {/* Wszystkie dane (GDPR) */}
          <div className="p-4 rounded-lg border-2 border-primary/50 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Pełny export (GDPR)</p>
                <p className="text-sm text-muted-foreground">
                  Wszystkie Twoje dane w jednym pliku JSON
                </p>
              </div>
              <Button
                onClick={() => handleExport('all', 'json')}
                disabled={exporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Pobierz wszystko
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usunięcie konta */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Strefa niebezpieczna
          </CardTitle>
          <CardDescription>
            Nieodwracalne akcje związane z Twoim kontem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <p className="font-medium text-destructive mb-2">Usunięcie konta</p>
            <p className="text-sm text-muted-foreground mb-4">
              Po usunięciu konta wszystkie Twoje dane zostaną trwale usunięte. Ta akcja jest nieodwracalna.
            </p>
            <Button variant="destructive" disabled>
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń konto (wkrótce)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

