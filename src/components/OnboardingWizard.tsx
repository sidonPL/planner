'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Home,
  Users,
  MapPin,
  ChefHat,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  {
    id: 1,
    title: 'Witaj w Family Planner! 👋',
    description: 'Zacznijmy od szybkiego przewodnika',
    icon: Home,
  },
  {
    id: 2,
    title: 'Stwórz gospodarstwo domowe',
    description: 'Nazwij swoje gospodarstwo lub dołącz do istniejącego',
    icon: Users,
  },
  {
    id: 3,
    title: 'Poznaj kluczowe funkcje',
    description: 'Szybki przegląd najważniejszych możliwości',
    icon: Sparkles,
  },
  {
    id: 4,
    title: 'Dodaj pierwszy przepis',
    description: 'Zacznij organizować swoje ulubione potrawy',
    icon: ChefHat,
  },
  {
    id: 5,
    title: 'Stwórz pierwsze zadanie',
    description: 'Zarządzaj obowiązkami domowymi',
    icon: CheckSquare,
  },
  {
    id: 6,
    title: 'Gotowe! 🎉',
    description: 'Wszystko jest już skonfigurowane',
    icon: Check,
  },
];

export function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [householdName, setHouseholdName] = useState('');

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;
  const currentStepData = steps[currentStep - 1];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as complete
      localStorage.setItem('onboarding-completed', 'true');
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding-completed', 'true');
    onComplete();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 text-center py-8">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <Home className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">Witaj w Family Planner!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Family Planner to kompleksowa aplikacja do zarządzania życiem rodzinnym.
              Organizuj zadania, przepisy, zakupy, harmonogram i wiele więcej - wszystko w jednym miejscu.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
              <div className="p-4 rounded-lg border">
                <CheckSquare className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm font-medium">Zadania</p>
              </div>
              <div className="p-4 rounded-lg border">
                <ChefHat className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm font-medium">Przepisy</p>
              </div>
              <div className="p-4 rounded-lg border">
                <Users className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm font-medium">Rodzina</p>
              </div>
              <div className="p-4 rounded-lg border">
                <MapPin className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm font-medium">Wycieczki</p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 py-8">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <Users className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <Label htmlFor="household-name">Nazwa gospodarstwa domowego</Label>
                <Input
                  id="household-name"
                  placeholder="np. Rodzina Kowalskich"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Możesz to zmienić później w ustawieniach
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 py-8">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center">Kluczowe funkcje</h3>
            <div className="space-y-4 max-w-md mx-auto">
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="rounded-full bg-primary/10 p-2 mt-1">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Ctrl+K - Command Palette</p>
                  <p className="text-sm text-muted-foreground">
                    Szybka nawigacja po całej aplikacji
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="rounded-full bg-primary/10 p-2 mt-1">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">? - Skróty klawiszowe</p>
                  <p className="text-sm text-muted-foreground">
                    Zobacz wszystkie dostępne skróty
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="rounded-full bg-primary/10 p-2 mt-1">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Synchronizacja rodziny</p>
                  <p className="text-sm text-muted-foreground">
                    Wszyscy członkowie widzą aktualne dane
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 py-8">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <ChefHat className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center">Dodaj pierwszy przepis</h3>
            <p className="text-center text-muted-foreground max-w-md mx-auto">
              Przepisy pozwalają Ci organizować ulubione potrawy, planować posiłki i generować listy zakupów.
            </p>
            <div className="max-w-md mx-auto">
              <Button
                onClick={() => {
                  localStorage.setItem('onboarding-completed', 'true');
                  router.push('/recipes?new=true');
                  onComplete();
                }}
                className="w-full"
              >
                Dodaj pierwszy przepis
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-3">
                Lub pomiń ten krok i zrób to później
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 py-8">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <CheckSquare className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center">Stwórz pierwsze zadanie</h3>
            <p className="text-center text-muted-foreground max-w-md mx-auto">
              Zadania pomagają zarządzać obowiązkami domowymi i śledzić postępy.
            </p>
            <div className="max-w-md mx-auto">
              <Button
                onClick={() => {
                  localStorage.setItem('onboarding-completed', 'true');
                  router.push('/tasks?new=true');
                  onComplete();
                }}
                className="w-full"
              >
                Stwórz pierwsze zadanie
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-3">
                Lub pomiń ten krok i zrób to później
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 py-8 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <Check className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">Wszystko gotowe! 🎉</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Gratulacje! Twoje konto jest skonfigurowane i możesz zacząć korzystać z Family Planner.
            </p>
            <div className="max-w-md mx-auto space-y-3">
              <Button onClick={() => router.push('/')} className="w-full">
                Przejdź do Dashboard
              </Button>
              <p className="text-sm text-muted-foreground">
                Wskazówka: Użyj <kbd className="px-2 py-1 bg-muted rounded border">Ctrl+K</kbd> do szybkiej nawigacji!
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStepData.icon && <currentStepData.icon className="h-5 w-5" />}
            Krok {currentStep} z {steps.length}
          </DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <Progress value={progress} className="h-2" />

        {/* Step content */}
        <div className="min-h-[300px]">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Pomiń przewodnik
          </Button>

          <div className="flex gap-2">
            {currentStep > 1 && currentStep < steps.length && (
              <Button variant="outline" onClick={handlePrev}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Wstecz
              </Button>
            )}
            <Button onClick={handleNext}>
              {currentStep === steps.length ? (
                'Zakończ'
              ) : (
                <>
                  Dalej
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 pt-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`h-2 w-2 rounded-full transition-colors ${
                step.id === currentStep
                  ? 'bg-primary'
                  : step.id < currentStep
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if onboarding is needed
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if we're in the browser (not SSR)
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('onboarding-completed');
      if (!completed) {
        // Show onboarding after a short delay
        setTimeout(() => setShowOnboarding(true), 500);
      }
    }
  }, []);

  return {
    showOnboarding,
    setShowOnboarding,
  };
}

