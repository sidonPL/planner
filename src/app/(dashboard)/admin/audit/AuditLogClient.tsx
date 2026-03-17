'use client';

import { useState } from 'react';
import useSWR from 'swr';
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
import { DashboardSkeleton } from '@/components/admin/DashboardSkeleton';
import { AdminError } from '@/components/admin/AdminError';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AuditLog {
  id: string;
  createdAt: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  user: {
    name: string | null;
    email: string;
  } | null;
}

export function AuditLogClient() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    userId: '',
    action: 'all',
    entityType: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Build query string
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '50',
    ...Object.fromEntries(
      Object.entries(appliedFilters).filter(([, v]) => v !== '' && v !== 'all')
    ),
  });

  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/audit?${queryParams}`,
    fetcher
  );

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setPage(1); // Reset to first page
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      userId: '',
      action: 'all',
      entityType: 'all',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export to CSV');
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <AdminError error={error} onRetry={() => mutate()} />;
  }

  const { logs = [], pagination } = data || {};

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Historia wszystkich akcji w systemie
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => mutate()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Eksportuj CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Page</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {page} / {pagination?.totalPages || 1}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Showing</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length} logs</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtry
          </CardTitle>
          <CardDescription>Filtruj logi według kryteriów</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Akcja</label>
              <Select
                value={filters.action}
                onValueChange={(value) =>
                  setFilters({ ...filters, action: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="CREATE_USER">Create User</SelectItem>
                  <SelectItem value="UPDATE_USER">Update User</SelectItem>
                  <SelectItem value="DELETE_USER">Delete User</SelectItem>
                  <SelectItem value="CREATE_RECIPE">Create Recipe</SelectItem>
                  <SelectItem value="UPDATE_RECIPE">Update Recipe</SelectItem>
                  <SelectItem value="DELETE_RECIPE">Delete Recipe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Typ encji</label>
              <Select
                value={filters.entityType}
                onValueChange={(value) =>
                  setFilters({ ...filters, entityType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Recipe">Recipe</SelectItem>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Notification">Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data od</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters} size="sm">
              <Search className="h-4 w-4 mr-2" />
              Zastosuj filtry
            </Button>
            <Button onClick={handleResetFilters} variant="outline" size="sm">
              Resetuj
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Logi ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Użytkownik</TableHead>
                  <TableHead>Akcja</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Brak logów do wyświetlenia</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: AuditLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.user?.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.user?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.entityType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entityId || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.ipAddress || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Strona {page} z {pagination.totalPages} (
                {pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Poprzednia
                </Button>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasMore}
                  variant="outline"
                  size="sm"
                >
                  Następna
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

