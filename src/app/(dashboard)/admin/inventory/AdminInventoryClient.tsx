'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowLeft, AlertTriangle, TrendingDown, Boxes } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  expiringCount: number;
  lowStockCount: number;
  topCategories: Array<{ category: string; count: number }>;
  expiringItems: Array<{
    id: string;
    name: string;
    quantity: number;
    expiryDate: Date;
    householdName: string;
  }>;
}

type ApiExpiringItem = Omit<InventoryStats['expiringItems'][number], 'expiryDate'> & {
  expiryDate: string | Date;
};

type ApiInventoryStats = Omit<InventoryStats, 'expiringItems'> & {
  expiringItems: ApiExpiringItem[];
};

export function AdminInventoryClient() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/inventory/stats');
      if (response.ok) {
        const data = await response.json() as { stats: ApiInventoryStats };
        setStats({
          ...data.stats,
          expiringItems: data.stats.expiringItems.map((item) => ({
            ...item,
            expiryDate: new Date(item.expiryDate),
          })),
        });
      }
    } catch (error) {
      console.error('Error loading inventory stats:', error);
    } finally {
      setLoading(false);
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
              <Package className="h-8 w-8 text-green-500" />
              Przegląd Inwentarza
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Statystyki produktów we wszystkich gospodarstwach
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produkty</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">We wszystkich gospodarstwach</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wartość</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalValue.toFixed(2) || 0} zł</div>
            <p className="text-xs text-muted-foreground">Szacowana wartość</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wygasające</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.expiringCount || 0}</div>
            <p className="text-xs text-muted-foreground">Wygasają w ciągu 7 dni</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Niski stan</CardTitle>
            <Boxes className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">Poniżej minimum</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top Kategorie</CardTitle>
          <CardDescription>Najczęściej używane kategorie produktów</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : (
            <div className="space-y-2">
              {stats?.topCategories.map((cat, index) => (
                <div key={cat.category} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-lg w-8">#{index + 1}</div>
                    <div>
                      <p className="font-medium">{cat.category}</p>
                      <p className="text-sm text-muted-foreground">{cat.count} produktów</p>
                    </div>
                  </div>
                  <Badge variant="outline">{cat.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Produkty wygasające w ciągu 7 dni
          </CardTitle>
          <CardDescription>Produkty wymagające uwagi</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : stats?.expiringItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak produktów wygasających w najbliższym czasie
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Ilość</TableHead>
                  <TableHead>Data ważności</TableHead>
                  <TableHead>Gospodarstwo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.expiringItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {formatDistanceToNow(item.expiryDate, {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.householdName}</TableCell>
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

