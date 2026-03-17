'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

const TOUR_KEY = 'gamification-tour-completed';

interface TourStep {
  title: string;
  content: string;
  illustration?: string;
}

const tourSteps: TourStep[] = [
  {
    title: 'Witaj w Systemie Gamifikacji! 🎮',
    content:
      'Odkryj nowy sposób na motywację! System gamifikacji nagradza Cię za wykonywanie zadań, utrzymywanie nawyków i osiąganie celów. Ten krótki przewodnik pokaże Ci jak to działa. ✨',
    illustration: '🎮',
  },
  {
    title: 'Widget Gamifikacji 📊',
    content:
      'W prawym górnym rogu widzisz swój aktualny poziom, XP, serię aktywności i liczbę osiągnięć. Kliknij widget aby zobaczyć więcej szczegółów!',
    illustration: '📊',
  },
  {
    title: 'Codzienna Nagroda 🎁',
    content:
      'Loguj się codziennie aby otrzymać bonus XP! Im dłuższa seria, tym większe nagrody. Możesz zdobyć nawet 200 XP za 30 dni z rzędu!',
    illustration: '🎁',
  },
  {
    title: 'Jak zdobywać XP? ⭐',
    content: `Zdobywaj XP za różne aktywności:
• Zadania: 10-20 XP za ukończenie
• Przepisy: 15+ XP za utworzenie
• Zakupy: 20-50 XP za zakończenie
• Posiłki: 10 XP za zaplanowanie
• Inwentarz: 5 XP za zarządzanie
• Rutyny: 10-20 XP za ukończenie`,
    illustration: '⭐',
  },
  {
    title: 'System Poziomów 🎯',
    content: `Im więcej XP zdobędziesz, tym wyższy poziom osiągniesz! Każdy kolejny poziom wymaga więcej XP:
• Level 1 → 2: 100 XP
• Level 5 → 6: 500 XP
• Level 10 → 11: 1000 XP
Formuła: Level × 100 XP`,
    illustration: '🎯',
  },
  {
    title: 'Osiągnięcia 🏆',
    content:
      'Odblokowuj specjalne osiągnięcia za różne aktywności! Każde osiągnięcie daje dodatkowe XP i pokazuje Twój progres. Sprawdź stronę Osiągnięć aby zobaczyć wszystkie dostępne nagrody!',
    illustration: '🏆',
  },
  {
    title: 'Daily Quests 📋',
    content:
      'Codziennie otrzymujesz nowe zadania do wykonania. Ukończ je aby zdobyć dodatkowe XP i utrzymać swoją serię!',
    illustration: '📋',
  },
  {
    title: 'Weekly Challenges 🎯',
    content:
      'Co tydzień pojawiają się nowe wyzwania dla całego gospodarstwa. Współpracuj z rodziną aby je ukończyć i zdobyć wielkie nagrody!',
    illustration: '🏅',
  },
  {
    title: 'Gotowy do startu! 🚀',
    content:
      'Teraz znasz podstawy systemu gamifikacji. Zacznij wykonywać zadania, planuj posiłki i zdobywaj XP! Pamiętaj: każda mała akcja przybliża Cię do następnego poziomu! 💪',
    illustration: '🚀',
  },
];

/**
 * Gamification Onboarding Tour
 * Interactive tour showing users the gamification system
 */
export function GamificationTour() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if tour was already completed
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      // Start tour after a short delay
      setTimeout(() => setOpen(true), 1500);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    setOpen(false);
  };

  const handleSkip = () => {
    handleClose();
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const step = tourSteps[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{step?.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Krok {currentStep + 1} z {tourSteps.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Illustration */}
          {step?.illustration && (
            <div className="flex justify-center">
              <div className="text-8xl">{step.illustration}</div>
            </div>
          )}

          {/* Content */}
          <div className="text-center whitespace-pre-line text-muted-foreground">
            {step?.content}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-center text-muted-foreground">
              Krok {currentStep + 1} z {tourSteps.length}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Pomiń
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Wstecz
            </Button>
            <Button onClick={handleNext}>
              {currentStep === tourSteps.length - 1 ? (
                'Zakończ'
              ) : (
                <>
                  Dalej
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manually restart the tour
 */
export function useRestartTour() {
  const restartTour = () => {
    localStorage.removeItem(TOUR_KEY);
    window.location.reload();
  };

  return { restartTour };
}
