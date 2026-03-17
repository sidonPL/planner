'use client';

import { RotateCcw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SoundSettings } from '@/components/gamification/SoundSettings';
import { toast } from 'sonner';

/**
 * Gamification Settings Tab
 * Combines sound settings with tour restart and other gamification options
 */
export function GamificationSettingsTab() {
  const handleRestartTour = () => {
    try {
      localStorage.removeItem('gamification-tour-completed');
      toast.success('Przewodnik zostanie uruchomiony po odświeżeniu strony');

      // Auto reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error restarting tour:', error);
      toast.error('Nie udało się zresetować przewodnika');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sound Settings */}
      <SoundSettings />

      {/* Tour Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-500" />
            Przewodnik po Gamifikacji
          </CardTitle>
          <CardDescription>
            Uruchom ponownie interaktywny przewodnik po systemie gamifikacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Przewodnik dla początkujących</p>
              <p className="text-sm text-muted-foreground">
                9-krokowy przewodnik pokazujący jak działa system nagród, osiągnięć i poziomów
              </p>
            </div>
            <Button onClick={handleRestartTour} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Uruchom ponownie
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

