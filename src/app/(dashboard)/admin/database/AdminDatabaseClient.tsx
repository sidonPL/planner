'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  ArrowLeft,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  HardDrive,
  Zap,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface TableStats {
  name: string;
  rows: number;
  size: string;
  lastUpdate: Date | null;
}

interface BackupInfo {
  id: string;
  filename: string;
  size: string;
  createdAt: Date;
}

interface DatabaseStats {
  size: string;
  connections: number;
}

type ApiTableStats = Omit<TableStats, 'lastUpdate'> & {
  lastUpdate: string | Date | null;
};

type ApiBackupInfo = Omit<BackupInfo, 'createdAt'> & {
  createdAt: string | Date;
};

export function AdminDatabaseClient() {
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [tables, setTables] = useState<TableStats[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [backing, setBacking] = useState(false);

  useEffect(() => {
    loadStats();
    loadBackups();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/database/stats');
      if (response.ok) {
        const data = await response.json() as { stats: DatabaseStats; tables: ApiTableStats[] };
        setDbStats(data.stats);
        setTables(data.tables.map((t) => ({
          ...t,
          lastUpdate: t.lastUpdate ? new Date(t.lastUpdate) : null,
        })));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/admin/database/backups');
      if (response.ok) {
        const data = await response.json() as { backups: ApiBackupInfo[] };
        setBackups(data.backups.map((b) => ({
          ...b,
          createdAt: new Date(b.createdAt),
        })));
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const handleBackup = async () => {
    setBacking(true);
    toast.info('Tworzenie backup...');
    try {
      const response = await fetch('/api/admin/database/backup', {
        method: 'POST',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planner-backup-${new Date().toISOString()}.sql`;
        a.click();
        toast.success('Backup utworzony i pobrany!');
        loadBackups();
      } else {
        toast.error('Błąd tworzenia backup');
      }
    } catch {
      toast.error('Błąd połączenia');
    } finally {
      setBacking(false);
    }
  };

  const handleOptimize = async () => {
    toast.info('Optymalizacja bazy danych...');
    try {
      const response = await fetch('/api/admin/database/optimize', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Baza danych zoptymalizowana!');
        loadStats();
      } else {
        toast.error('Błąd optymalizacji');
      }
    } catch {
      toast.error('Błąd połączenia');
    }
  };

  const handleVacuum = async () => {
    toast.info('VACUUM w toku...');
    try {
      const response = await fetch('/api/admin/database/vacuum', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('VACUUM wykonany!');
        loadStats();
      } else {
        toast.error('Błąd VACUUM');
      }
    } catch {
      toast.error('Błąd połączenia');
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
              <Database className="h-8 w-8 text-slate-500" />
              Zarządzanie Bazą Danych
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Backup, optymalizacja i monitoring PostgreSQL
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBackup} disabled={backing}>
            <Download className="mr-2 h-4 w-4" />
            {backing ? 'Tworzenie...' : 'Backup teraz'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rozmiar bazy</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats?.size || '0 MB'}</div>
            <p className="text-xs text-muted-foreground">PostgreSQL</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tabele</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
            <p className="text-xs text-muted-foreground">Total tables</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backupy</CardTitle>
            <Download className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
            <p className="text-xs text-muted-foreground">Dostępne</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats?.connections || '0'}</div>
            <p className="text-xs text-muted-foreground">Aktywne połączenia</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Szybkie akcje</CardTitle>
          <CardDescription>Operacje na bazie danych</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={handleOptimize}>
              <Zap className="mr-2 h-4 w-4" />
              Optymalizuj
            </Button>
            <Button variant="outline" onClick={handleVacuum}>
              <RefreshCw className="mr-2 h-4 w-4" />
              VACUUM
            </Button>
            <Button variant="outline" disabled>
              <Upload className="mr-2 h-4 w-4" />
              Restore (TODO)
            </Button>
            <Button variant="outline" disabled>
              <Trash2 className="mr-2 h-4 w-4 text-red-500" />
              Clean old data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tables Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statystyki tabel ({tables.length})</CardTitle>
          <CardDescription>Rozmiar i liczba rekordów w każdej tabeli</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Liczba rekordów</TableHead>
                  <TableHead>Rozmiar</TableHead>
                  <TableHead>Ostatnia aktualizacja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table) => (
                  <TableRow key={table.name}>
                    <TableCell className="font-mono text-sm">{table.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{table.rows.toLocaleString()}</Badge>
                    </TableCell>
                    <TableCell>{table.size}</TableCell>
                    <TableCell>
                      {table.lastUpdate ? (
                        <span className="text-sm">
                          {formatDistanceToNow(table.lastUpdate, {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Brak danych</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Backups History */}
      <Card>
        <CardHeader>
          <CardTitle>Historia backupów</CardTitle>
          <CardDescription>Ostatnie kopie zapasowe bazy danych</CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Download className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Brak backupów</p>
              <p className="text-xs mt-1">Utwórz pierwszy backup klikając przycisk powyżej</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa pliku</TableHead>
                  <TableHead>Rozmiar</TableHead>
                  <TableHead>Utworzono</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                    <TableCell>{backup.size}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(backup.createdAt, {
                        addSuffix: true,
                        locale: pl,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Migrations Info */}
      <Card>
        <CardHeader>
          <CardTitle>Migracje Prisma</CardTitle>
          <CardDescription>Historia migracji bazy danych</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium">Status migracji</p>
                <p className="text-sm text-muted-foreground">
                  Sprawdź czy wszystkie migracje są zastosowane
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                <Clock className="mr-2 h-4 w-4" />
                Sprawdź status
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              💡 Użyj <code className="px-1.5 py-0.5 rounded bg-muted">npx prisma migrate status</code> w terminalu
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                Uwaga!
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Operacje na bazie danych mogą być nieodwracalne. Zawsze twórz backup przed
                wykonaniem operacji restore lub clean. W środowisku produkcyjnym zalecane są
                automatyczne backupy codziennie o północy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

