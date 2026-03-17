import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminErrorProps {
  error?: Error;
  onRetry?: () => void;
}

export function AdminError({ error, onRetry }: AdminErrorProps) {
  return (
    <div className="container mx-auto p-6">
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <CardTitle className="text-red-900 dark:text-red-100">
                Błąd ładowania danych
              </CardTitle>
              <CardDescription className="text-red-700 dark:text-red-300">
                {error?.message || 'Nie udało się pobrać danych z serwera'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Spróbuj ponownie
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a href="/admin">Powrót do panelu</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

