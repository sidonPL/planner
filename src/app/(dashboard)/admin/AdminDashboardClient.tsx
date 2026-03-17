'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/admin/StatsCard';
import { DashboardSkeleton } from '@/components/admin/DashboardSkeleton';
import { AdminError } from '@/components/admin/AdminError';
import {
  Shield,
  Users,
  Trophy,
  ChefHat,
  Package,
  Calendar,
  DollarSign,
  ClipboardList,
  Bell,
  Settings,
  Database,
  Activity,
  FileText,
  Zap,
  Clock,
  UserCheck,
  ListTodo,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AdminDashboardClientProps {
  userId: string;
}

export function AdminDashboardClient({ userId }: AdminDashboardClientProps) {
  // Fetch real-time stats z auto-refresh co 2 minuty
  const { data: stats, error, isLoading, mutate } = useSWR(
    '/api/admin/stats',
    fetcher,
    {
      refreshInterval: 120000, // 2 minutes (zmniejszone z 30s aby nie przekraczać rate limits)
      revalidateOnFocus: false, // wyłączone auto-refresh przy focus aby zmniejszyć ilość requestów
    }
  );

  // Loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error) {
    return <AdminError error={error} onRetry={() => mutate()} />;
  }

  // Debug - sprawdź co zwraca API
  console.log('Admin Stats:', stats);

  const adminSections = [
    {
      title: 'Użytkownicy & Gospodarstwa',
      description: 'Zarządzaj użytkownikami i gospodarstwami domowymi',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      href: '/admin/users',
      stats: { label: 'Aktywni', value: stats?.users?.active || 0 },
    },
    {
      title: 'Gamifikacja',
      description: 'XP, osiągnięcia, questy, odznaki',
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      href: '/admin/gamification',
      stats: { label: 'Total XP', value: stats?.gamification?.totalXP || 0 },
    },
    {
      title: 'Przepisy',
      description: 'Zarządzaj przepisami i składnikami',
      icon: ChefHat,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      href: '/admin/recipes',
      stats: { label: 'Przepisów', value: stats?.recipes?.total || 0 },
    },
    {
      title: 'Inwentarz',
      description: 'Produkty, kategorie, lokalizacje',
      icon: Package,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      href: '/admin/inventory',
      stats: { label: 'Produktów', value: stats?.inventory?.total || 0 },
    },
    {
      title: 'Zadania',
      description: 'Szablony, priorytety, eskalacje',
      icon: ClipboardList,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      href: '/admin/tasks',
      stats: { label: 'Aktywnych', value: stats?.tasks?.active || 0 },
    },
    {
      title: 'Kalendarz & Wydarzenia',
      description: 'Święta, rocznice, wydarzenia',
      icon: Calendar,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50 dark:bg-pink-950/20',
      href: '/admin/calendar',
      stats: { label: 'Wydarzeń', value: 0 },
    },
    {
      title: 'Finanse',
      description: 'Budżety, transakcje, kategorie',
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      href: '/admin/finances',
      stats: { label: 'Transakcji', value: 0 },
    },
    {
      title: 'Powiadomienia',
      description: 'System powiadomień i alerty',
      icon: Bell,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      href: '/admin/notifications',
      stats: { label: 'Wysłanych', value: stats?.notifications?.total || 0 },
    },
    {
      title: 'Cron Jobs',
      description: 'Zadania cykliczne i monitoring',
      icon: Clock,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
      href: '/admin/cron',
      stats: { label: 'Jobs', value: 0 },
    },
    {
      title: 'Audit Log',
      description: 'Historia zmian i działań',
      icon: FileText,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
      href: '/admin/audit',
      stats: { label: 'Logów', value: stats?.audit?.total || 0 },
    },
    {
      title: 'Baza danych',
      description: 'Backup, restore, optimization',
      icon: Database,
      color: 'text-slate-500',
      bgColor: 'bg-slate-50 dark:bg-slate-950/20',
      href: '/admin/database',
      stats: { label: 'Tabele', value: 0 },
    },
    {
      title: 'Ustawienia systemowe',
      description: 'Konfiguracja aplikacji',
      icon: Settings,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-950/20',
      href: '/admin/settings',
      stats: { label: 'Opcji', value: 0 },
    },
  ];

  const quickActions = [
    { label: 'Użytkownicy', icon: Users, href: '/admin/users' },
    { label: 'Przepisy', icon: ChefHat, href: '/admin/recipes' },
    { label: 'Zadania', icon: ClipboardList, href: '/admin/tasks' },
    { label: 'Audit Log', icon: FileText, href: '/admin/audit' },
  ];

  const systemAlerts = [
    {
      title: 'System działa poprawnie',
      description: 'Wszystkie serwisy są dostępne',
      type: 'success' as const,
      icon: Activity,
    },
  ];

  return (
    <div className="w-full max-w-[2000px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Centralne zarządzanie aplikacją Planner
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Zap className="h-4 w-4 mr-2" />
          Admin Mode
        </Badge>
      </div>

      {/* System Alerts */}
      {systemAlerts.map((alert, index) => (
        <Card key={index} className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <alert.icon className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  {alert.title}
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {alert.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats?.users?.total || 0}
          subtitle="All registered users"
          change={`+${stats?.users?.new || 0} this month`}
          icon={Users}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-50 dark:bg-blue-950/20"
          trend="up"
        />
        <StatsCard
          title="Active Users"
          value={stats?.users?.active || 0}
          subtitle="Last 7 days"
          icon={UserCheck}
          iconColor="text-green-500"
          iconBgColor="bg-green-50 dark:bg-green-950/20"
        />
        <StatsCard
          title="Recipes"
          value={stats?.recipes?.total || 0}
          subtitle={`${stats?.recipes?.imagesPercentage || 0}% with images`}
          icon={ChefHat}
          iconColor="text-orange-500"
          iconBgColor="bg-orange-50 dark:bg-orange-950/20"
        />
        <StatsCard
          title="Active Tasks"
          value={stats?.tasks?.active || 0}
          subtitle={`${stats?.tasks?.completionRate || 0}% completion rate`}
          icon={ListTodo}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-50 dark:bg-purple-950/20"
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total XP"
          value={stats?.gamification?.totalXP || 0}
          subtitle={`${stats?.gamification?.totalBadges || 0} badges awarded`}
          icon={Trophy}
          iconColor="text-yellow-500"
          iconBgColor="bg-yellow-50 dark:bg-yellow-950/20"
        />
        <StatsCard
          title="Inventory Items"
          value={stats?.inventory?.total || 0}
          subtitle={`${stats?.inventory?.expiringSoon || 0} expiring soon`}
          icon={Package}
          iconColor="text-green-500"
          iconBgColor="bg-green-50 dark:bg-green-950/20"
          trend={stats?.inventory?.expiringSoon > 0 ? 'down' : 'neutral'}
        />
        <StatsCard
          title="Notifications"
          value={stats?.notifications?.total || 0}
          subtitle={`${stats?.notifications?.unread || 0} unread`}
          icon={Bell}
          iconColor="text-red-500"
          iconBgColor="bg-red-50 dark:bg-red-950/20"
        />
        <StatsCard
          title="Audit Logs"
          value={stats?.audit?.total || 0}
          subtitle={`${stats?.audit?.recent || 0} in last 7 days`}
          icon={FileText}
          iconColor="text-indigo-500"
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/20"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Szybkie akcje</span>
            <Badge variant="outline" className="font-normal">
              <Clock className="h-3 w-3 mr-1" />
              Auto-refresh: 30s
            </Badge>
          </CardTitle>
          <CardDescription>Najczęściej używane funkcje</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  asChild
                >
                  <Link href={action.href}>
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{action.label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Admin Sections Grid */}
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-6">Wszystkie moduły</h2>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href} className="group">
                <Card
                  className="hover:shadow-xl transition-all duration-200 cursor-pointer h-full border-2 hover:border-primary group-hover:scale-[1.02] min-w-[280px]"
                >
                  <CardHeader className="pb-4 space-y-4 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`p-4 rounded-xl ${section.bgColor} flex-shrink-0 shadow-sm ring-1 ring-black/5`}>
                        <Icon className={`h-8 w-8 ${section.color}`} />
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-3xl font-bold tabular-nums tracking-tight">
                          {section.stats.value.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wide">
                          {section.stats.label}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 px-6">
                    <CardTitle className="text-lg mb-2.5 line-clamp-1 font-bold">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-sm line-clamp-2 leading-relaxed">
                      {section.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Ostatnia aktywność</CardTitle>
          <CardDescription>Najnowsze działania w systemie</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Brak ostatniej aktywności</p>
            <p className="text-xs mt-1">Działania adminów będą tutaj widoczne</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

