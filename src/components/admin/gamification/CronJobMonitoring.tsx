'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface CronJob {
  name: string;
  schedule: string;
  lastRun: string | null;
  nextRun: string;
  status: 'success' | 'error' | 'pending' | 'running';
  lastResult: any;
}

export function CronJobMonitoring() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    loadCronStatus();
    const interval = setInterval(loadCronStatus, 30000); // Refresh co 30s
    return () => clearInterval(interval);
  }, []);

  const loadCronStatus = async () => {
    try {
      const response = await fetch('/api/admin/gamification/cron-status');
      if (response.ok) {
        const data = await response.json();
        setCronJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error loading cron status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRun = async (jobName: string) => {
    setRunning(jobName);
    toast.info(`Uruchamianie ${jobName}...`);

    try {
      const response = await fetch(`/api/admin/gamification/cron-trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobName }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`${jobName} wykonany pomyślnie!`);
        loadCronStatus();
      } else {
        toast.error(`Błąd uruchamiania ${jobName}`);
      }
    } catch (error) {
      toast.error('Błąd połączenia');
    } finally {
      setRunning(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Sukces</Badge>;
      case 'error':
        return <Badge variant="destructive">Błąd</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500">Uruchomiony</Badge>;
      default:
        return <Badge variant="secondary">Oczekujący</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Ładowanie statusu cron jobs...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monitoring Cron Jobs</CardTitle>
              <CardDescription>
                Status i historia wykonania zadań cyklicznych
              </CardDescription>
            </div>
            <Button onClick={loadCronStatus} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Odśwież
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cronJobs.map((job) => (
              <Card key={job.name}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(job.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{job.name}</h3>
                          {getStatusBadge(job.status)}
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Schedule: {job.schedule}</span>
                          </div>
                          {job.lastRun && (
                            <div>
                              Ostatnie uruchomienie:{' '}
                              {formatDistanceToNow(new Date(job.lastRun), {
                                addSuffix: true,
                                locale: pl,
                              })}
                            </div>
                          )}
                          <div>
                            Następne uruchomienie:{' '}
                            {formatDistanceToNow(new Date(job.nextRun), {
                              addSuffix: true,
                              locale: pl,
                            })}
                          </div>
                        </div>

                        {/* Last Result */}
                        {job.lastResult && (
                          <div className="mt-3 p-3 rounded-lg bg-muted">
                            <p className="text-sm font-medium mb-2">Ostatni wynik:</p>
                            {job.lastResult.success ? (
                              <div className="text-sm space-y-1">
                                <p className="text-green-600">
                                  ✓ {job.lastResult.message || 'Sukces'}
                                </p>
                                {job.lastResult.householdsProcessed && (
                                  <p className="text-muted-foreground">
                                    Przetworzono: {job.lastResult.householdsProcessed} gospodarstw
                                  </p>
                                )}
                                {job.lastResult.results && (
                                  <div className="mt-2 space-y-1">
                                    {job.lastResult.results.map((r: any, i: number) => (
                                      <p key={i} className="text-xs">
                                        • {r.householdName}: {r.created || 0} questów
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-red-600">
                                ✗ {job.lastResult.error || 'Błąd'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleManualRun(job.name)}
                      disabled={running === job.name}
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {running === job.name ? 'Uruchamianie...' : 'Uruchom teraz'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {cronJobs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak skonfigurowanych cron jobs
            </div>
          )}
        </CardContent>
      </Card>

      {/* PM2 Integration Hint */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PM2 Status</CardTitle>
          <CardDescription>
            Sprawdź status w PM2: <code className="ml-2">pm2 list</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Monitoring:</strong> <code>pm2 logs cron-daily-quests</code>
            </p>
            <p>
              <strong>Manual trigger:</strong> <code>pm2 restart cron-daily-quests</code>
            </p>
            <p>
              <strong>Real-time:</strong> <code>pm2 monit</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

