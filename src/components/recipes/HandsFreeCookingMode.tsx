"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX, Maximize2, Minimize2, SkipForward, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HandsFreeCookingModeProps {
  steps: Array<{
    id: string;
    content: string;
    duration?: number | null;
    temperature?: number | null;
    tip?: string | null;
    order: number;
  }>;
  recipeName: string;
  onClose: () => void;
}

export function HandsFreeCookingMode({
  steps,
  recipeName,
  onClose,
}: HandsFreeCookingModeProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [fontSize, setFontSize] = useState(20); // 20-40px
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(() => {
    const initialDuration = steps[0]?.duration;
    return initialDuration ? initialDuration * 60 : null;
  });
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentStep = steps[currentStepIndex];
  const currentStepDuration = currentStep?.duration;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const nextStep = useCallback(() => {
    setCurrentStepIndex(prev => {
      if (prev >= steps.length - 1) return prev;

      const nextIndex = prev + 1;
      const stepDuration = steps[nextIndex]?.duration;
      setTimeRemaining(stepDuration ? stepDuration * 60 : null);
      setIsTimerRunning(false);
      // Auto-scroll to top
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return nextIndex;
    });
  }, [steps]);

  // Wake Lock - prevent screen from sleeping
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
        };
        if (nav.wakeLock) {
          const wakeLock = await nav.wakeLock.request('screen');
          wakeLockRef.current = wakeLock;
          console.log('Wake Lock aktywny');
        }
      } catch (err) {
        console.log('Wake Lock nie dostępny:', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        void wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Voice reading
  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Auto-read step when changed
  useEffect(() => {
    if (voiceEnabled && currentStep) {
      const textToRead = `Krok ${currentStepIndex + 1}. ${currentStep.content}`;
      speakText(textToRead);
    }

    return () => {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentStepIndex, voiceEnabled, currentStep, speakText]);

  // Timer
  useEffect(() => {
    if (isTimerRunning && timeRemaining !== null && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            setIsTimerRunning(false);
            toast.success(`Timer zakończony! Przejdź do następnego kroku.`);
            speakText("Timer zakończony");

            // Play notification sound
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {});
            } catch {}

            // Auto-advance if enabled
            if (autoAdvance && currentStepIndex < steps.length - 1) {
              setTimeout(() => nextStep(), 2000);
            }

            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isTimerRunning, timeRemaining, autoAdvance, currentStepIndex, steps.length, speakText, nextStep]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStepIndex(prev => {
      if (prev <= 0) return prev;

      const nextIndex = prev - 1;
      const stepDuration = steps[nextIndex]?.duration;
      setTimeRemaining(stepDuration ? stepDuration * 60 : null);
      setIsTimerRunning(false);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return nextIndex;
    });
  }, [steps]);

  const toggleStepComplete = useCallback(() => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentStepIndex)) {
        newSet.delete(currentStepIndex);
      } else {
        newSet.add(currentStepIndex);
      }
      return newSet;
    });
  }, [currentStepIndex]);

  const startTimer = useCallback(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      setIsTimerRunning(true);
      speakText("Timer uruchomiony");
    }
  }, [timeRemaining, speakText]);

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false);
    speakText("Timer zatrzymany");
  }, [speakText]);

  const resetTimer = useCallback(() => {
    if (currentStepDuration) {
      setTimeRemaining(currentStepDuration * 60);
      setIsTimerRunning(false);
      speakText("Timer zresetowany");
    }
  }, [currentStepDuration, speakText]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowRight':
          nextStep();
          break;
        case 'ArrowLeft':
          prevStep();
          break;
        case ' ':
          e.preventDefault();
          if (timeRemaining !== null) {
            if (isTimerRunning) {
              pauseTimer();
            } else {
              startTimer();
            }
          }
          break;
        case 'Enter':
          toggleStepComplete();
          break;
        case 'r':
          resetTimer();
          break;
        case 'v':
          setVoiceEnabled(prev => !prev);
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    isTimerRunning,
    nextStep,
    pauseTimer,
    prevStep,
    resetTimer,
    startTimer,
    timeRemaining,
    toggleFullscreen,
    toggleStepComplete,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-50 bg-background flex flex-col",
        isFullscreen && "bg-black text-white"
      )}
    >
      {/* Header with controls */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{recipeName}</h2>
          <p className="text-sm text-muted-foreground">
            Krok {currentStepIndex + 1} z {steps.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice toggle */}
          <div className="flex items-center gap-2 mr-4">
            <Switch
              checked={voiceEnabled}
              onCheckedChange={setVoiceEnabled}
              id="voice"
            />
            <Label htmlFor="voice" className="text-sm cursor-pointer">
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Label>
          </div>

          {/* Auto-advance toggle */}
          <div className="flex items-center gap-2 mr-4">
            <Switch
              checked={autoAdvance}
              onCheckedChange={setAutoAdvance}
              id="auto"
            />
            <Label htmlFor="auto" className="text-sm cursor-pointer">
              <SkipForward className="h-4 w-4" />
            </Label>
          </div>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>

          {/* Close */}
          <Button variant="ghost" size="icon" onClick={onClose}>
            ✕
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Step number badge */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Krok {currentStepIndex + 1}
            </Badge>
            {currentStep.temperature && (
              <Badge variant="outline" className="text-lg px-4 py-2">
                🌡️ {currentStep.temperature}°C
              </Badge>
            )}
          </div>

          {/* Step content - LARGE TEXT */}
          <div
            className="leading-relaxed"
            style={{ fontSize: `${fontSize}px` }}
          >
            {currentStep.content}
          </div>

          {/* Step tip */}
          {currentStep.tip && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded">
              <p className="flex items-start gap-2 text-base">
                <span className="text-yellow-600 dark:text-yellow-400">💡</span>
                {currentStep.tip}
              </p>
            </div>
          )}

          {/* Timer section */}
          {timeRemaining !== null && (
            <div className="p-6 bg-card border rounded-xl space-y-4">
              <div className="text-center">
                <div className={cn(
                  "text-6xl font-bold font-mono",
                  timeRemaining < 60 && "text-red-500",
                  isTimerRunning && "animate-pulse"
                )}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {currentStep.duration} minut
                </div>
              </div>

              <div className="flex justify-center gap-3">
                {!isTimerRunning ? (
                  <Button size="lg" onClick={startTimer}>
                    ▶️ Start
                  </Button>
                ) : (
                  <Button size="lg" variant="secondary" onClick={pauseTimer}>
                    ⏸️ Pauza
                  </Button>
                )}
                <Button size="lg" variant="outline" onClick={resetTimer}>
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${((currentStep.duration! * 60 - timeRemaining) / (currentStep.duration! * 60)) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto">
          {/* Font size slider */}
          <div className="mb-4">
            <Label className="text-sm">Rozmiar tekstu</Label>
            <Slider
              value={[fontSize]}
              onValueChange={([value]) => setFontSize(value)}
              min={16}
              max={40}
              step={2}
              className="mt-2"
            />
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="flex-1"
            >
              ← Poprzedni
            </Button>

            <Button
              size="lg"
              variant={completedSteps.has(currentStepIndex) ? "secondary" : "default"}
              onClick={toggleStepComplete}
              className="flex-1"
            >
              {completedSteps.has(currentStepIndex) ? "✓ Zrobione" : "Oznacz jako zrobione"}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={nextStep}
              disabled={currentStepIndex === steps.length - 1}
              className="flex-1"
            >
              Następny →
            </Button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Klawisze: ← → nawigacja | Spacja timer | Enter gotowe | V głos | F pełny ekran | R reset
          </div>
        </div>
      </div>
    </div>
  );
}

