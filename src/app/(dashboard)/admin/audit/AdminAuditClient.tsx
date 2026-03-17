'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Search, Download, ArrowLeft, Filter, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface AuditLog {
  id: string;
  userId: string;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export function AdminAuditClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/admin/audit');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs.map((log: any) => ({
          ...log,
          createdAt: new Date(log.createdAt),
        })));
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/audit/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEntity = entityFilter === 'all' || log.entity === entityFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesEntity && matchesAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Badge variant="default" className="bg-green-500">Utworzono</Badge>;
      case 'UPDATE':
        return <Badge variant="default" className="bg-blue-500">Zaktualizowano</Badge>;
      case 'DELETE':
        return <Badge variant="destructive">Usunięto</Badge>;
      case 'LOGIN':
        return <Badge variant="outline">Zalogowano</Badge>;
      case 'LOGOUT':
        return <Badge variant="outline">Wylogowano</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const entities = Array.from(new Set(logs.map((log) => log.entity)));
  const actions = Array.from(new Set(logs.map((log) => log.action)));

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
              <FileText className="h-8 w-8 text-indigo-500" />
              Audit Log
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Historia wszystkich działań w systemie
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total logów</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dziś</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                logs.filter(
                  (log) =>
                    new Date(log.createdAt).toDateString() === new Date().toDateString()
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utworzono</CardTitle>
            <Badge variant="default" className="bg-green-500">CREATE</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter((log) => log.action === 'CREATE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usunięto</CardTitle>
            <Badge variant="destructive">DELETE</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter((log) => log.action === 'DELETE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po użytkowniku, akcji lub encji..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Typ encji" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie encje</SelectItem>
                {entities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Akcja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie akcje</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Logi aktywności ({filteredLogs.length})</CardTitle>
          <CardDescription>Chronologiczna historia wszystkich działań</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak logów spełniających kryteria
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Użytkownik</TableHead>
                  <TableHead>Akcja</TableHead>
                  <TableHead>Encja</TableHead>
                  <TableHead>Szczegóły</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(log.createdAt, {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.createdAt.toLocaleString('pl-PL')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.userName || 'System'}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.userId.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.entity}</Badge>
                      {log.entityId && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.entityId.slice(0, 8)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.details && (
                        <pre className="text-xs max-w-md overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono">{log.ipAddress || 'N/A'}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

