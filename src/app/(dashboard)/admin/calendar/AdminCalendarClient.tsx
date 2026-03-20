'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowLeft, PartyPopper, Heart, Cake } from 'lucide-react';
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

interface CalendarStats {
  totalEvents: number;
  upcomingEvents: number;
  anniversaries: number;
  birthdays: number;
  upcomingList: Array<{
    id: string;
    title: string;
    date: Date;
    type: string;
    householdName: string;
  }>;
}

type ApiUpcomingEvent = Omit<CalendarStats['upcomingList'][number], 'date'> & {
  date: string | Date;
};

type ApiCalendarStats = Omit<CalendarStats, 'upcomingList'> & {
  upcomingList: ApiUpcomingEvent[];
};

export function AdminCalendarClient() {
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/calendar/stats');
      if (response.ok) {
        const data = await response.json() as { stats: ApiCalendarStats };
        setStats({
          ...data.stats,
          upcomingList: data.stats.upcomingList.map((event) => ({
            ...event,
            date: new Date(event.date),
          })),
        });
      }
    } catch (error) {
      console.error('Error loading calendar stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ANNIVERSARY':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'BIRTHDAY':
        return <Cake className="h-4 w-4 text-pink-500" />;
      default:
        return <PartyPopper className="h-4 w-4 text-blue-500" />;
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
              <Calendar className="h-8 w-8 text-pink-500" />
              Zarządzanie Kalendarzem
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Wydarzenia, rocznice i urodziny
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wydarzenia</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nadchodzące</CardTitle>
            <PartyPopper className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingEvents || 0}</div>
            <p className="text-xs text-muted-foreground">W ciągu 30 dni</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rocznice</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.anniversaries || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urodziny</CardTitle>
            <Cake className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.birthdays || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Nadchodzące wydarzenia</CardTitle>
          <CardDescription>
            Wydarzenia w ciągu najbliższych 30 dni
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : stats?.upcomingList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak nadchodzących wydarzeń
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Nazwa</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Gospodarstwo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.upcomingList.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{getEventIcon(event.type)}</TableCell>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatDistanceToNow(event.date, {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </Badge>
                    </TableCell>
                    <TableCell>{event.householdName}</TableCell>
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

