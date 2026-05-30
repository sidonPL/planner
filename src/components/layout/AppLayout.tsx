'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TTSProvider } from "@/hooks/useTTS";
import { SSEProvider } from "@/hooks/useSSE";
import { KioskMode } from "@/components/KioskMode";
import { CommandPalette } from "@/components/CommandPalette";
import { CookieConsent } from "@/components/CookieConsent";
import { KeyboardShortcuts, useKeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { OnboardingWizard, useOnboarding } from "@/components/OnboardingWizard";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { VoiceCommands, useVoiceCommands } from "@/components/VoiceCommands";
import { RewardThemeProvider } from "@/components/gamification/RewardThemeProvider";
import { GeofenceTrackingProvider } from "@/hooks/useGeofenceTracking";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession();
  const useOnboardingWithOptions = useOnboarding as (options?: {
    disabled?: boolean;
    storageKey?: string;
  }) => {
    showOnboarding: boolean;
    setShowOnboarding: (open: boolean) => void;
  };
  const OnboardingWizardWithStorage = OnboardingWizard as React.ComponentType<{
    open: boolean;
    onComplete: () => void;
    hasHousehold?: boolean;
    storageKey?: string;
  }>;
  const onboardingStorageKey = session?.user?.id
    ? `onboarding-completed:${session.user.id}`
    : 'onboarding-completed';
  const [commandOpen, setCommandOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const { open: shortcutsOpen, setOpen: setShortcutsOpen } = useKeyboardShortcuts();
  const { showOnboarding, setShowOnboarding } = useOnboardingWithOptions({
    disabled: Boolean(session?.user?.householdId),
    storageKey: onboardingStorageKey,
  });
  const { open: voiceOpen, setOpen: setVoiceOpen } = useVoiceCommands();

  const loadProfileCosmetics = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      setActiveTheme(data.activeTheme || null);
    } catch {
      // noop
    }
  }, [session?.user?.id]);

  // Załaduj aktywny motyw użytkownika
  useEffect(() => {
    loadProfileCosmetics();
  }, [loadProfileCosmetics]);

  useEffect(() => {
    const handler = () => {
      loadProfileCosmetics();
    };

    window.addEventListener('cosmetics-updated', handler);
    return () => window.removeEventListener('cosmetics-updated', handler);
  }, [loadProfileCosmetics]);

  return (
    <TTSProvider>
      <SSEProvider>
        <GeofenceTrackingProvider>
          <RewardThemeProvider activeTheme={activeTheme}>
          <KioskMode>
            <div className="app-shell h-dvh max-h-dvh flex overflow-hidden bg-background">
              {/* Sidebar - desktop only */}
              <Sidebar className="hidden lg:flex w-64 shrink-0" />

              {/* Main content area */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <Header />
                <main className="app-main safe-area-bottom min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6 lg:p-6 xl:p-8">
                  <Breadcrumbs className="mb-4" />
                  {children}
                </main>
              </div>

              {/* Command Palette - Global Ctrl+K */}
              <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

              {/* Keyboard Shortcuts Help - Global ? */}
              <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

              {/* Voice Commands - Global Ctrl+M */}
              <VoiceCommands open={voiceOpen} onOpenChange={setVoiceOpen} />

              {/* Onboarding Wizard - First time users */}
              <OnboardingWizardWithStorage
                open={showOnboarding}
                onComplete={() => setShowOnboarding(false)}
                hasHousehold={Boolean(session?.user?.householdId)}
                storageKey={onboardingStorageKey}
              />

              {/* PWA Install Prompt */}
              <PWAInstallPrompt />

              {/* Cookie Consent Banner */}
              <CookieConsent />
            </div>
          </KioskMode>
          </RewardThemeProvider>
        </GeofenceTrackingProvider>
      </SSEProvider>
    </TTSProvider>
  );
}
