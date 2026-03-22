"use client";

import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore, ReactNode } from "react";

interface TTSContextType {
  speak: (text: string, options?: TTSOptions) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  rate: number;
  setRate: (rate: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

interface TTSOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
}

const TTSContext = createContext<TTSContextType | null>(null);

export function TTSProvider({ children }: { children: ReactNode }) {
  const isSupported = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(() => {
    if (typeof window === "undefined") return 1;
    const savedRate = localStorage.getItem("tts-rate");
    return savedRate ? parseFloat(savedRate) : 1;
  });
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 1;
    const savedVolume = localStorage.getItem("tts-volume");
    return savedVolume ? parseFloat(savedVolume) : 1;
  });
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("tts-enabled") === "true";
  });

  // Sprawdź czy TTS jest wspierany i załaduj głosy
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    // Pobierz głosy
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Znajdź polski głos domyślnie
      const polishVoice = availableVoices.find(
        (v) => v.lang.startsWith("pl") || v.lang === "pl-PL"
      );
      if (polishVoice) {
        setSelectedVoice((prev) => prev || polishVoice);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // Zapisuj ustawienia
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tts-enabled", String(enabled));
      localStorage.setItem("tts-rate", String(rate));
      localStorage.setItem("tts-volume", String(volume));
    }
  }, [enabled, rate, volume]);

  const speak = useCallback(
    (text: string, options?: TTSOptions) => {
      if (!isSupported || !enabled) return;

      // Anuluj poprzednie wypowiedzi
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = options?.voice || selectedVoice;
      utterance.rate = options?.rate || rate;
      utterance.pitch = options?.pitch || 1;
      utterance.volume = options?.volume || volume;
      utterance.lang = "pl-PL";

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, enabled, selectedVoice, rate, volume]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
  }, []);

  return (
    <TTSContext.Provider
      value={{
        speak,
        stop,
        isSpeaking,
        isSupported,
        voices,
        selectedVoice,
        setVoice,
        rate,
        setRate,
        volume,
        setVolume,
        enabled,
        setEnabled,
      }}
    >
      {children}
    </TTSContext.Provider>
  );
}

export function useTTS() {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error("useTTS must be used within a TTSProvider");
  }
  return context;
}

// Hook do odczytywania powiadomień
export function useNotificationTTS() {
  const { speak, enabled, isSupported } = useTTS();

  const speakNotification = useCallback(
    (title: string, message?: string) => {
      if (!enabled || !isSupported) return;

      const text = message ? `${title}. ${message}` : title;
      speak(text);
    },
    [speak, enabled, isSupported]
  );

  return { speakNotification, enabled, isSupported };
}

