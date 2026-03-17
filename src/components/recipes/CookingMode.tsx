"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Thermometer,
  Lightbulb,
  ChefHat,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface CookingStep {
  id: string;
  order: number;
  content: string;
  duration?: number | null;
  temperature?: number | null;
  image?: string | null;
  tip?: string | null;
  isOptional: boolean;
}

interface CookingModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeName: string;
  steps: CookingStep[];
  servings: number;
}

export function CookingMode({
  open,
  onOpenChange,
  recipeName,
  steps,
  servings,
}: CookingModeProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [timer, setTimer] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning || timer === null || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === null || prev <= 1) {
          setIsTimerRunning(false);
          // Timer zakończony - możesz dodać dźwięk lub powiadomienie
          if (voiceEnabled && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("Czas minął! Przejdź do następnego kroku.");
            utterance.lang = 'pl-PL';
            window.speechSynthesis.speak(utterance);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timer, voiceEnabled]);

  // Voice announcement when step changes
  useEffect(() => {
    if (voiceEnabled && currentStep && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Krok ${currentStepIndex + 1}. ${currentStep.content}`
      );
      utterance.lang = 'pl-PL';
      window.speechSynthesis.speak(utterance);
    }
  }, [currentStepIndex, voiceEnabled, currentStep]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      // Use setTimeout to avoid setting state during effect
      const timer = setTimeout(() => {
        setCurrentStepIndex(0);
        setCompletedSteps(new Set());
        setTimer(null);
        setIsTimerRunning(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleNext = () => {
    if (!isLastStep) {
      setCompletedSteps(new Set(completedSteps).add(currentStepIndex));
      setCurrentStepIndex(currentStepIndex + 1);
      setTimer(null);
      setIsTimerRunning(false);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
      setTimer(null);
      setIsTimerRunning(false);
    }
  };

  const handleMarkComplete = () => {
    setCompletedSteps(new Set(completedSteps).add(currentStepIndex));
  };

  const handleStartTimer = () => {
    if (currentStep.duration) {
      setTimer(currentStep.duration * 60); // Convert minutes to seconds
      setIsTimerRunning(true);
    }
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    if (currentStep.duration) {
      setTimer(currentStep.duration * 60);
      setIsTimerRunning(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  if (!currentStep) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {recipeName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {servings} {servings === 1 ? "porcja" : "porcje"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVoice}
                title={voiceEnabled ? "Wyłącz głos" : "Włącz głos"}
              >
                {voiceEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Krok {currentStepIndex + 1} z {steps.length}
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Step Image */}
          {currentStep.image && (
            <div className="rounded-lg overflow-hidden relative h-64">
              <Image
                src={currentStep.image}
                alt={`Krok ${currentStepIndex + 1}`}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Step Number & Content */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg",
                  completedSteps.has(currentStepIndex)
                    ? "bg-green-500 text-white"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {completedSteps.has(currentStepIndex) ? (
                  <Check className="h-6 w-6" />
                ) : (
                  currentStepIndex + 1
                )}
              </div>
              <div className="flex-1">
                <p className="text-lg leading-relaxed">{currentStep.content}</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-3">
              {currentStep.duration && (
                <Badge variant="outline" className="gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {currentStep.duration} min
                </Badge>
              )}
              {currentStep.temperature && (
                <Badge variant="outline" className="gap-1.5">
                  <Thermometer className="h-3.5 w-3.5" />
                  {currentStep.temperature}°C
                </Badge>
              )}
              {currentStep.isOptional && (
                <Badge variant="secondary">Opcjonalny</Badge>
              )}
            </div>

            {/* Tip */}
            {currentStep.tip && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Wskazówka
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {currentStep.tip}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Timer */}
            {currentStep.duration && (
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Timer</span>
                  {timer !== null && (
                    <span className={cn(
                      "text-2xl font-mono font-bold",
                      isTimerRunning && timer <= 10 && "text-red-500 animate-pulse"
                    )}>
                      {formatTime(timer)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isTimerRunning ? (
                    <Button
                      onClick={handleStartTimer}
                      className="flex-1"
                      variant="default"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {timer === null ? "Uruchom timer" : "Wznów"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopTimer}
                      className="flex-1"
                      variant="secondary"
                    >
                      Zatrzymaj
                    </Button>
                  )}
                  <Button
                    onClick={handleResetTimer}
                    variant="outline"
                    disabled={timer === null}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Poprzedni
          </Button>

          <div className="flex gap-2">
            {!completedSteps.has(currentStepIndex) && (
              <Button variant="outline" onClick={handleMarkComplete}>
                <Check className="mr-2 h-4 w-4" />
                Oznacz jako ukończone
              </Button>
            )}
          </div>

          {!isLastStep ? (
            <Button onClick={handleNext}>
              Następny
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Zakończ gotowanie
            </Button>
          )}
        </div>

        {/* Steps Overview (Mini) */}
        <div className="flex gap-1 overflow-x-auto py-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStepIndex(index)}
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full text-xs font-medium transition-colors",
                index === currentStepIndex
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : completedSteps.has(index)
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              title={`Krok ${index + 1}`}
            >
              {completedSteps.has(index) ? <Check className="h-4 w-4 mx-auto" /> : index + 1}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

