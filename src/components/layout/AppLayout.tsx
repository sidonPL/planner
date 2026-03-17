'use client';

import { useState, useEffect } from 'react';
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

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession();
  const [commandOpen, setCommandOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const { open: shortcutsOpen, setOpen: setShortcutsOpen } = useKeyboardShortcuts();
  const { showOnboarding, setShowOnboarding } = useOnboarding();
  const { open: voiceOpen, setOpen: setVoiceOpen } = useVoiceCommands();

  // Załaduj aktywny motyw użytkownika
  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/user/profile')
        .then((res) => res.json())
        .then((data) => {
          if (data.activeTheme) {
            setActiveTheme(data.activeTheme);
          }
        })
        .catch(() => {});
    }
  }, [session?.user?.id]);

  return (
    <TTSProvider>
      <SSEProvider>
        <RewardThemeProvider activeTheme={activeTheme}>
          <KioskMode>
            <div className="h-screen flex overflow-hidden bg-background">
              {/* Sidebar - desktop only */}
              <Sidebar className="hidden lg:flex w-64 shrink-0" />

              {/* Main content area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-6 xl:p-8">
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
              <OnboardingWizard
                open={showOnboarding}
                onComplete={() => setShowOnboarding(false)}
              />

              {/* PWA Install Prompt */}
              <PWAInstallPrompt />

              {/* Cookie Consent Banner */}
              <CookieConsent />
            </div>
          </KioskMode>
        </RewardThemeProvider>
      </SSEProvider>
    </TTSProvider>
  );
}
