'use client';

import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'family-planner-cookie-consent';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-lg">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <Cookie className="h-8 w-8 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">
              Ta strona używa plików cookie
            </p>
            <p className="text-xs text-muted-foreground">
              Używamy niezbędnych plików cookie do zapewnienia prawidłowego działania aplikacji
              (sesja, preferencje). Nie używamy cookies reklamowych ani śledzących.{' '}
              <Link
                href="/legal/privacy-policy"
                className="underline hover:text-foreground"
              >
                Dowiedz się więcej
              </Link>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="flex-1 sm:flex-none"
            >
              Odrzuć
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 sm:flex-none"
            >
              Akceptuję
            </Button>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0"
            onClick={handleReject}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Zamknij</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

