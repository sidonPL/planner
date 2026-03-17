'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Activity,
  TrendingUp,
  Calendar,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface CronJob {
  name: string;
  description: string;
  schedule: string;
  endpoint: string;
  icon: typeof Clock;
  color: string;
}

const CRON_JOBS: CronJob[] = [
  {
    name: 'Task Reminders',
    description: 'Przypomnienia o zadaniach',
    schedule: '*/15 * * * *',
    endpoint: '/api/cron/task-reminders',
    icon: CheckCircle2,
    color: 'text-blue-500',
  },
  {
    name: 'Schedule Reminders',
    description: 'Przypomnienia harmonogramu',
    schedule: '*/5 * * * *',
    endpoint: '/api/cron/schedule-reminders',
    icon: Calendar,
    color: 'text-purple-500',
  },
  {
    name: 'Meal Reminders',
    description: 'Przypomnienia o posiłkach',
    schedule: '*/10 * * * *',
    endpoint: '/api/cron/meal-reminders',
    icon: Activity,
    color: 'text-orange-500',
  },
  {
    name: 'Calendar Sync',
    description: 'Synchronizacja kalendarza',
    schedule: '0 * * * *',
    endpoint: '/api/cron/calendar-sync',
    icon: RefreshCw,
    color: 'text-green-500',
  },
  {
    name: 'Event Reminders',
    description: 'Przypomnienia o wydarzeniach',
    schedule: '0 7 * * *',
    endpoint: '/api/cron/event-reminders',
    icon: Calendar,
    color: 'text-pink-500',
  },
  {
    name: 'Birthday Reminders',
    description: 'Przypomnienia urodzinowe',
    schedule: '0 8 * * *',
    endpoint: '/api/cron/birthday-reminders',
    icon: Activity,
    color: 'text-yellow-500',
  },
  {
    name: 'Anniversary Reminders',
    description: 'Przypomnienia o rocznicach',
    schedule: '0 8 * * *',
    endpoint: '/api/cron/anniversary-reminders',
    icon: Activity,
    color: 'text-red-500',
  },
  {
    name: 'Inventory Alerts',
    description: 'Alerty inwentarza',
    schedule: '0 18 * * *',
    endpoint: '/api/cron/inventory-alerts',
    icon: AlertCircle,
    color: 'text-orange-600',
  },
  {
    name: 'Trip Reminders',
    description: 'Przypomnienia o wycieczkach',
    schedule: '0 8 * * *',
    endpoint: '/api/cron/trip-reminders',
    icon: Activity,
    color: 'text-cyan-500',
  },
  {
    name: 'Routine Reminders',
    description: 'Przypomnienia o rutynach',
    schedule: '0 * * * *',
    endpoint: '/api/cron/routine-reminders',
    icon: Clock,
    color: 'text-indigo-500',
  },
  {
    name: 'Generate Routine Instances',
    description: 'Generowanie instancji rutyn',
    schedule: '0 0 * * *',
    endpoint: '/api/cron/generate-routine-instances',
    icon: Zap,
    color: 'text-violet-500',
  },
  {
    name: 'Daily Routine Digest',
    description: 'Codzienny digest rutyn',
    schedule: '0 7 * * *',
    endpoint: '/api/cron/daily-routine-digest',
    icon: Activity,
    color: 'text-teal-500',
  },
  {
    name: 'Weekly Reports',
    description: 'Raporty tygodniowe',
    schedule: '0 9 * * 1',
    endpoint: '/api/cron/weekly-reports',
    icon: TrendingUp,
    color: 'text-emerald-500',
  },
  {
    name: 'Monthly Reports',
    description: 'Raporty miesięczne',
    schedule: '0 10 1 * *',
    endpoint: '/api/cron/monthly-reports',
    icon: TrendingUp,
    color: 'text-blue-600',
  },
  {
    name: 'Task Escalation',
    description: 'Eskalacja zadań',
    schedule: '0 9 * * *',
    endpoint: '/api/cron/task-escalation',
    icon: AlertCircle,
    color: 'text-red-600',
  },
  {
    name: 'Auto Restock',
    description: 'Automatyczne uzupełnienie',
    schedule: '0 6 * * *',
    endpoint: '/api/cron/auto-restock',
    icon: RefreshCw,
    color: 'text-green-600',
  },
  {
    name: 'Daily Quests',
    description: 'Generowanie daily quests',
    schedule: '0 0 * * *',
    endpoint: '/api/cron/daily-quests',
    icon: Zap,
    color: 'text-yellow-600',
  },
];

interface JobStatus {
  name: string;
  status: 'running' | 'success' | 'error' | 'idle';
  lastRun?: Date;
  nextRun?: Date;
  duration?: number;
  error?: string;
}

export function AdminCronClient() {
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize job statuses
    const initialStatuses: Record<string, JobStatus> = {};
    CRON_JOBS.forEach(job => {
      initialStatuses[job.name] = {
        name: job.name,
        status: 'idle',
      };
    });
    setJobStatuses(initialStatuses);
  }, []);

  const handleManualTrigger = async (job: CronJob) => {
    setLoading(prev => ({ ...prev, [job.name]: true }));
    setJobStatuses(prev => ({
      ...prev,
      [job.name]: { ...prev[job.name], status: 'running' },
    }));

    const startTime = Date.now();

    try {
      const response = await fetch(job.endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`,
        },
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        setJobStatuses(prev => ({
          ...prev,
          [job.name]: {
            ...prev[job.name],
            status: 'success',
            lastRun: new Date(),
            duration,
          },
        }));
        toast.success(`${job.name} wykonany pomyślnie w ${duration}ms`);
      } else {
        const error = await response.text();
        setJobStatuses(prev => ({
          ...prev,
          [job.name]: {
            ...prev[job.name],
            status: 'error',
            lastRun: new Date(),
            duration,
            error,
          },
        }));
        toast.error(`Błąd: ${job.name}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      setJobStatuses(prev => ({
        ...prev,
        [job.name]: {
          ...prev[job.name],
          status: 'error',
          lastRun: new Date(),
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
      toast.error(`Błąd wykonania: ${job.name}`);
    } finally {
      setLoading(prev => ({ ...prev, [job.name]: false }));
    }
  };

  const parseCronSchedule = (schedule: string): string => {
    // Uproszczone parsowanie cron schedule
    if (schedule === '*/15 * * * *') return 'Co 15 minut';
    if (schedule === '*/5 * * * *') return 'Co 5 minut';
    if (schedule === '*/10 * * * *') return 'Co 10 minut';
    if (schedule === '0 * * * *') return 'Co godzinę';
    if (schedule === '0 7 * * *') return 'Codziennie o 7:00';
    if (schedule === '0 8 * * *') return 'Codziennie o 8:00';
    if (schedule === '0 18 * * *') return 'Codziennie o 18:00';
    if (schedule === '0 9 * * *') return 'Codziennie o 9:00';
    if (schedule === '0 6 * * *') return 'Codziennie o 6:00';
    if (schedule === '0 0 * * *') return 'Codziennie o północy';
    if (schedule === '0 9 * * 1') return 'Poniedziałki o 9:00';
    if (schedule === '0 10 1 * *') return '1. dnia miesiąca o 10:00';
    return schedule;
  };


  const getStatusBadge = (status: JobStatus['status']) => {
    switch (status) {
      case 'running':
        return (
          <Badge className="bg-blue-500">
            <Play className="h-3 w-3 mr-1" />
            Running
          </Badge>
        );
      case 'success':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Pause className="h-3 w-3 mr-1" />
            Idle
          </Badge>
        );
    }
  };

  const totalJobs = CRON_JOBS.length;
  const successJobs = Object.values(jobStatuses).filter(s => s.status === 'success').length;
  const errorJobs = Object.values(jobStatuses).filter(s => s.status === 'error').length;
  const runningJobs = Object.values(jobStatuses).filter(s => s.status === 'running').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-8 w-8 text-primary" />
          Cron Jobs Monitoring
        </h1>
        <p className="text-muted-foreground mt-1">
          Zarządzaj i monitoruj wszystkie zadania cykliczne w systemie
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Zarejestrowanych zadań
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Running
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{runningJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktualnie wykonywane
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pomyślnie wykonane
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Błędy wykonania
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Wszystkie zadania ({totalJobs})</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CRON_JOBS.map((job) => {
            const Icon = job.icon;
            const status = jobStatuses[job.name];
            const isLoading = loading[job.name];

            return (
              <Card key={job.name} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('p-2 rounded-lg bg-muted', job.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{job.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {job.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Schedule */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{parseCronSchedule(job.schedule)}</span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Status:</span>
                    {status && getStatusBadge(status.status)}
                  </div>

                  {/* Last Run */}
                  {status?.lastRun && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Ostatnie uruchomienie:</strong>
                      <br />
                      {format(status.lastRun, 'PPpp', { locale: pl })}
                      {status.duration && (
                        <span className="ml-2 text-primary">
                          ({status.duration}ms)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {status?.error && (
                    <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                      <strong>Error:</strong> {status.error}
                    </div>
                  )}

                  {/* Manual Trigger */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleManualTrigger(job)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Wykonywanie...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Uruchom teraz
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Informacja o zadaniach cyklicznych
              </p>
              <p className="text-blue-800 dark:text-blue-200">
                Te zadania są automatycznie uruchamiane przez PM2 zgodnie z harmonogramem zdefiniowanym
                w <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">ecosystem.config.js</code>.
                Możesz uruchomić je manualnie klikając &quot;Uruchom teraz&quot; w celu testowania.
              </p>
              <p className="text-blue-800 dark:text-blue-200 mt-2">
                <strong>Uwaga:</strong> Upewnij się że PM2 jest uruchomiony na serwerze produkcyjnym:
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded ml-1">pm2 list</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

