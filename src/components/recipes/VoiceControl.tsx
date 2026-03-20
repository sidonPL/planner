
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Volume2, Pause, Play, SkipForward, SkipBack, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Type declarations for Web Speech API
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface ISpeechRecognitionEvent extends Event {
  results: ISpeechRecognitionResultList;
  resultIndex: number;
}

interface ISpeechRecognitionResultList {
  length: number;
  item(index: number): ISpeechRecognitionResult;
  [index: number]: ISpeechRecognitionResult;
}

interface ISpeechRecognitionResult {
  length: number;
  item(index: number): ISpeechRecognitionAlternative;
  [index: number]: ISpeechRecognitionAlternative;
  isFinal: boolean;
}

interface ISpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

function getSpeechRecognitionConstructor(): ISpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as Window & {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

interface VoiceControlProps {
  currentStepIndex: number;
  totalSteps: number;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onRepeat: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onSetTimer?: (minutes: number) => void;
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

// Supported voice commands
const COMMANDS = {
  NEXT: ['następny', 'dalej', 'next', 'skip'],
  PREVIOUS: ['poprzedni', 'wstecz', 'cofnij', 'back', 'previous'],
  REPEAT: ['powtórz', 'repeat', 'jeszcze raz', 'again'],
  PAUSE: ['pauza', 'pause', 'stop', 'zatrzymaj'],
  RESUME: ['wznów', 'resume', 'kontynuuj', 'continue', 'start'],
  TIMER: ['timer', 'minutnik', 'ustaw timer', 'set timer'],
} as const;

export function VoiceControl({
  currentStepIndex,
  totalSteps,
  onNextStep,
  onPreviousStep,
  onRepeat,
  onPause,
  onResume,
  onSetTimer,
  isEnabled = false,
  onToggle,
}: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isSupported = getSpeechRecognitionConstructor() !== null;

  // Process voice command
  const processCommand = useCallback((transcript: string) => {
    const words = transcript.toLowerCase().split(' ');

    // Check for "Next" commands
    if (COMMANDS.NEXT.some(cmd => words.includes(cmd))) {
      onNextStep();
      toast.success('➡️ Następny krok');
      return;
    }

    // Check for "Previous" commands
    if (COMMANDS.PREVIOUS.some(cmd => words.includes(cmd))) {
      onPreviousStep();
      toast.success('⬅️ Poprzedni krok');
      return;
    }

    // Check for "Repeat" commands
    if (COMMANDS.REPEAT.some(cmd => words.includes(cmd))) {
      onRepeat();
      toast.success('🔄 Powtarzam krok');
      return;
    }

    // Check for "Pause" commands
    if (COMMANDS.PAUSE.some(cmd => words.includes(cmd))) {
      setIsPaused(true);
      onPause?.();
      toast.success('⏸️ Pauza');
      return;
    }

    // Check for "Resume" commands
    if (COMMANDS.RESUME.some(cmd => words.includes(cmd))) {
      setIsPaused(false);
      onResume?.();
      toast.success('▶️ Wznowiono');
      return;
    }

    // Check for Timer commands (e.g., "timer 10 minut")
    if (COMMANDS.TIMER.some(cmd => transcript.includes(cmd))) {
      const minutesMatch = transcript.match(/(\d+)\s*(minut|minutes?)/i);
      if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1]);
        onSetTimer?.(minutes);
        toast.success(`⏲️ Timer ustawiony na ${minutes} minut`);
        return;
      }
    }

    // Unknown command
    console.log('Unknown command:', transcript);
  }, [onNextStep, onPreviousStep, onRepeat, onPause, onResume, onSetTimer]);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionConstructor) {
      console.warn("Speech Recognition not supported in this browser");
      return;
    }

    // Initialize Speech Recognition
    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = 'pl-PL'; // Polish language
    recognition.continuous = true; // Keep listening
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if enabled
      if (isEnabled && recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started, ignore
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Brak uprawnień do mikrofonu. Włącz mikrofon w ustawieniach przeglądarki.');
        onToggle?.(false);
      } else if (event.error !== 'no-speech') {
        // Ignore no-speech errors (normal during silence)
        toast.error(`Błąd rozpoznawania mowy: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();

      console.log('Voice command detected:', transcript);
      setLastCommand(transcript);

      // Process command
      processCommand(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isEnabled, onToggle, processCommand]);

  // Toggle voice control
  const toggleVoiceControl = useCallback(() => {
    if (!isSupported) {
      toast.error('Rozpoznawanie mowy nie jest obsługiwane w tej przeglądarce');
      return;
    }

    const newEnabled = !isEnabled;
    onToggle?.(newEnabled);

    if (newEnabled) {
      try {
        recognitionRef.current?.start();
        toast.success('🎤 Kontrola głosowa włączona');
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Nie udało się włączyć mikrofonu');
      }
    } else {
      recognitionRef.current?.stop();
      setIsListening(false);
      toast.info('🔇 Kontrola głosowa wyłączona');
    }
  }, [isEnabled, isSupported, onToggle]);

  if (!isSupported) {
    return null; // Don't show if not supported
  }

  return (
    <div className="space-y-3">
      {/* Main Control Button */}
      <div className="flex items-center gap-3">
        <Button
          variant={isEnabled ? "default" : "outline"}
          size="lg"
          onClick={toggleVoiceControl}
          className={cn(
            "relative",
            isListening && "ring-2 ring-red-500 ring-offset-2 animate-pulse"
          )}
        >
          {isEnabled ? (
            <>
              <Mic className="mr-2 h-5 w-5" />
              Kontrola głosowa
            </>
          ) : (
            <>
              <MicOff className="mr-2 h-5 w-5" />
              Włącz kontrolę głosową
            </>
          )}
        </Button>

        {isListening && (
          <Badge variant="destructive" className="animate-pulse">
            Słucham...
          </Badge>
        )}
      </div>

      {/* Status & Last Command */}
      {isEnabled && (
        <div className="rounded-lg bg-muted p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Krok {currentStepIndex + 1} z {totalSteps}
            </span>
          </div>

          {lastCommand && (
            <div className="text-xs text-muted-foreground">
              Ostatnia komenda: &quot;{lastCommand}&quot;
            </div>
          )}

          {/* Command Hints */}
          <div className="pt-2 border-t space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Dostępne komendy:
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>• &quot;Następny&quot; / &quot;Dalej&quot;</div>
              <div>• &quot;Poprzedni&quot; / &quot;Cofnij&quot;</div>
              <div>• &quot;Powtórz&quot;</div>
              <div>• &quot;Timer 10 minut&quot;</div>
              <div>• &quot;Pauza&quot; / &quot;Stop&quot;</div>
              <div>• &quot;Wznów&quot; / &quot;Start&quot;</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Buttons (visual feedback) */}
      {isEnabled && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousStep}
            disabled={currentStepIndex === 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onRepeat}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={isPaused ? onResume : onPause}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onNextStep}
            disabled={currentStepIndex === totalSteps - 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

