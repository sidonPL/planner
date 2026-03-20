'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface VoiceCommandsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function VoiceCommands({ open, onOpenChange }: VoiceCommandsProps) {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported] = useState(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pl-PL';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const processCommand = useCallback((command: string) => {
    console.log('Processing command:', command);

    // Navigation commands
    if (command.includes('otwórz zadania') || command.includes('pokaż zadania')) {
      router.push('/tasks');
      speak('Otwieram zadania');
      onOpenChange(false);
    } else if (command.includes('otwórz przepisy') || command.includes('pokaż przepisy')) {
      router.push('/recipes');
      speak('Otwieram przepisy');
      onOpenChange(false);
    } else if (command.includes('otwórz harmonogram') || command.includes('pokaż harmonogram')) {
      router.push('/schedule');
      speak('Otwieram harmonogram');
      onOpenChange(false);
    } else if (command.includes('otwórz inwentarz') || command.includes('pokaż inwentarz')) {
      router.push('/inventory');
      speak('Otwieram inwentarz');
      onOpenChange(false);
    } else if (command.includes('otwórz zakupy') || command.includes('pokaż zakupy')) {
      router.push('/shopping');
      speak('Otwieram listę zakupów');
      onOpenChange(false);
    } else if (command.includes('otwórz posiłki') || command.includes('pokaż posiłki')) {
      router.push('/meals');
      speak('Otwieram posiłki');
      onOpenChange(false);
    } else if (command.includes('dashboard') || command.includes('panel główny')) {
      router.push('/');
      speak('Otwieram panel główny');
      onOpenChange(false);
    }
    // Quick actions
    else if (command.includes('nowe zadanie') || command.includes('dodaj zadanie')) {
      router.push('/tasks?new=true');
      speak('Tworzę nowe zadanie');
      onOpenChange(false);
    } else if (command.includes('nowy przepis') || command.includes('dodaj przepis')) {
      router.push('/recipes?new=true');
      speak('Tworzę nowy przepis');
      onOpenChange(false);
    }
    // Help
    else if (command.includes('pomoc') || command.includes('co możesz zrobić')) {
      speak('Mogę otworzyć zadania, przepisy, harmonogram, inwentarz, zakupy lub posiłki. Mogę też stworzyć nowe zadanie lub przepis.');
    }
    // Unknown command
    else {
      speak('Nie rozpoznałem tej komendy. Powiedz "pomoc" aby usłyszeć dostępne komendy.');
    }

    setTranscript('');
  }, [router, onOpenChange, speak]);

  const recognition = useMemo(() => {
    if (!isSupported || typeof window === 'undefined') {
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return null;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'pl-PL';

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);

      if (event.results[current].isFinal) {
        processCommand(transcriptText.toLowerCase());
      }
    };

    recognitionInstance.onerror = (event: Event) => {
      console.error('Speech recognition error:', event);
      setIsListening(false);
      toast.error('Błąd rozpoznawania mowy');
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    return recognitionInstance;
  }, [isSupported, processCommand]);

  useEffect(() => {
    return () => {
      recognition?.abort();
    };
  }, [recognition]);

  const startListening = () => {
    if (recognition && !isListening) {
      try {
        recognition.start();
        setIsListening(true);
        setTranscript('');
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast.error('Nie można uruchomić rozpoznawania mowy');
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Komendy głosowe niedostępne</DialogTitle>
            <DialogDescription>
              Twoja przeglądarka nie obsługuje rozpoznawania mowy. Spróbuj użyć Chrome lub Edge.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Komendy głosowe
          </DialogTitle>
          <DialogDescription>
            Kliknij mikrofon i powiedz komendę
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Microphone button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              variant={isListening ? 'destructive' : 'default'}
              className={`h-24 w-24 rounded-full ${isListening ? 'animate-pulse' : ''}`}
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? (
                <MicOff className="h-12 w-12" />
              ) : (
                <Mic className="h-12 w-12" />
              )}
            </Button>
          </div>

          {/* Transcript display */}
          {(isListening || transcript) && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {isListening ? 'Słucham...' : 'Rozpoznano:'}
              </p>
              <p className="text-lg font-medium min-h-[2rem]">
                {transcript || '...'}
              </p>
            </div>
          )}

          {/* Available commands */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Przykładowe komendy:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• &quot;Otwórz zadania&quot;</p>
              <p>• &quot;Pokaż przepisy&quot;</p>
              <p>• &quot;Nowe zadanie&quot;</p>
              <p>• &quot;Otwórz harmonogram&quot;</p>
              <p>• &quot;Pomoc&quot;</p>
            </div>
          </div>

          {/* Status */}
          <div className="text-xs text-center text-muted-foreground">
            {isListening ? (
              <span className="text-green-500">● Aktywne</span>
            ) : (
              <span>○ Nieaktywne</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for voice commands
export function useVoiceCommands() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Open voice commands with Ctrl+M or Cmd+M
      if (e.key === 'm' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}

