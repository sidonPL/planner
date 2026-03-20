'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Bell, ArrowLeft, Send, Users, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface NotificationStats {
  total: number;
  read: number;
  unread: number;
  todaySent: number;
}

interface NotificationHistory {
  id: string;
  title: string;
  message: string;
  type: string;
  recipientCount: number;
  createdAt: Date;
}

type ApiNotificationHistory = Omit<NotificationHistory, 'createdAt'> & {
  createdAt: string | Date;
};

interface AdminNotificationsClientProps {
  userId: string;
}

export function AdminNotificationsClient({ userId }: AdminNotificationsClientProps) {
  void userId;
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Broadcast form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notifType, setNotifType] = useState('SYSTEM');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadStats();
    loadHistory();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/notifications/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/admin/notifications/history');
      if (response.ok) {
        const data = await response.json() as { history: ApiNotificationHistory[] };
        setHistory(data.history.map((h) => ({
          ...h,
          createdAt: new Date(h.createdAt),
        })));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleSendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Wypełnij tytuł i treść');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          type: notifType,
          target,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Wysłano powiadomienie do ${result.recipientCount} użytkowników!`);
        setTitle('');
        setMessage('');
        loadStats();
        loadHistory();
      } else {
        toast.error('Błąd wysyłania powiadomienia');
      }
    } catch {
      toast.error('Błąd połączenia');
    } finally {
      setSending(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      SYSTEM: 'bg-gray-500',
      TASK: 'bg-blue-500',
      EVENT: 'bg-purple-500',
      PAYMENT: 'bg-green-500',
      ACHIEVEMENT: 'bg-yellow-500',
    };
    return (
      <Badge variant="default" className={colors[type] || 'bg-gray-500'}>
        {type}
      </Badge>
    );
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
              <Bell className="h-8 w-8 text-red-500" />
              Zarządzanie Powiadomieniami
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Wysyłaj broadcast notifications i przeglądaj historię
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total wysłanych</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przeczytane</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.read || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? Math.round((stats.read / stats.total) * 100) : 0}% open rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nieprzeczytane</CardTitle>
            <Bell className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unread || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dziś</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todaySent || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="broadcast" className="space-y-4">
        <TabsList>
          <TabsTrigger value="broadcast" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Wyślij broadcast
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Historia
          </TabsTrigger>
        </TabsList>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wyślij powiadomienie do wszystkich</CardTitle>
              <CardDescription>
                Broadcast notification zostanie wysłane do wybranych użytkowników
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="np. Nowa funkcja dostępna!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Treść</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Szczegóły powiadomienia..."
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Typ</Label>
                  <Select value={notifType} onValueChange={setNotifType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SYSTEM">System</SelectItem>
                      <SelectItem value="TASK">Zadanie</SelectItem>
                      <SelectItem value="EVENT">Wydarzenie</SelectItem>
                      <SelectItem value="PAYMENT">Płatność</SelectItem>
                      <SelectItem value="ACHIEVEMENT">Osiągnięcie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">Odbiorcy</Label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger id="target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
                      <SelectItem value="admins">Tylko admini</SelectItem>
                      <SelectItem value="active">Aktywni (7 dni)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSendBroadcast} disabled={sending} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                {sending ? 'Wysyłanie...' : 'Wyślij powiadomienie'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historia wysłanych powiadomień ({history.length})</CardTitle>
              <CardDescription>
                Ostatnie broadcast notifications wysłane przez adminów
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Ładowanie...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Brak wysłanych powiadomień</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tytuł</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Odbiorcy</TableHead>
                      <TableHead>Treść</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((notif) => (
                      <TableRow key={notif.id}>
                        <TableCell>
                          <span className="text-sm">
                            {formatDistanceToNow(notif.createdAt, {
                              addSuffix: true,
                              locale: pl,
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{notif.title}</TableCell>
                        <TableCell>{getTypeBadge(notif.type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {notif.recipientCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {notif.message}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

