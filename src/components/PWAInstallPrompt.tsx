'use client';

import { useState, useEffect, useMemo } from 'react';
import { Download, X, Smartphone, Zap, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Sprawdź czy to iOS i czy aplikacja jest już zainstalowana
  const { isIOS, isStandalone } = useMemo(() => {
    if (typeof window === 'undefined') return { isIOS: false, isStandalone: false };
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    return { isIOS: iOS, isStandalone: standalone };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user has dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedDate = localStorage.getItem('pwa-install-dismissed-date');

      // Pokaż ponownie po 7 dniach
      if (dismissed && dismissedDate) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          return;
        }
      }

      // Nie pokazuj jeśli już zainstalowane
      if (!isStandalone) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }

    // Dla iOS - pokaż instrukcje po pewnym czasie (jeśli nie standalone)
    if (isIOS && !isStandalone) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000); // Pokaż po 5 sekundach

        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isIOS, isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response: ${outcome}`);

    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-date', Date.now().toString());
  };

  // Nie pokazuj jeśli już zainstalowane
  if (!showPrompt || isStandalone) return null;

  // Wersja dla iOS
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40">
        <div className="bg-card border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-primary/10 p-2">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">
                Zainstaluj Family Planner
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Dodaj aplikację do ekranu głównego:
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 mb-3 list-decimal list-inside">
                <li>Dotknij ikonę &quot;Udostępnij&quot; <span className="inline-block">⬆️</span></li>
                <li>Przewiń i wybierz &quot;Dodaj do ekranu głównego&quot;</li>
                <li>Dotknij &quot;Dodaj&quot;</li>
              </ol>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-xs"
                >
                  Rozumiem
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Wersja dla Android/Desktop
  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40">
      <div className="bg-card border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="rounded-full bg-primary/10 p-2">
              <Download className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Zainstaluj Family Planner
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Dodaj aplikację do ekranu głównego i korzystaj jak z aplikacji natywnej
            </p>

            {/* Korzyści z instalacji */}
            <div className="mb-3 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-primary" />
                <span>Szybszy dostęp</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <WifiOff className="h-3 w-3 text-primary" />
                <span>Działanie offline</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Smartphone className="h-3 w-3 text-primary" />
                <span>Powiadomienia push</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall} className="text-xs">
                Zainstaluj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs"
              >
                Nie teraz
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

