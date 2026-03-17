'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Brak połączenia</h1>
          <p className="text-muted-foreground">
            Nie masz dostępu do internetu. Niektóre funkcje mogą być niedostępne.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Twoje ostatnio przeglądane dane są dostępne offline.
          </p>
          <Button onClick={handleRetry} className="w-full">
            Spróbuj ponownie
          </Button>
        </div>

        <div className="pt-6 border-t">
          <h3 className="font-semibold mb-2">Dostępne offline:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Ostatnio wyświetlone strony</li>
            <li>✓ Zapisane dane w pamięci podręcznej</li>
            <li>✓ Przeglądanie offline</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

