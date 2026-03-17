"use client";

import { useState, useEffect, useRef } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { accentColors, AccentColorName } from "@/hooks/useAccentColor";

interface ProvidersProps {
  children: React.ReactNode;
}

// Komponent ładujący kolor akcentu
function AccentColorLoader({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const hasFetched = useRef(false);
  const hasAppliedLocal = useRef(false);

  useEffect(() => {
    // Załaduj z localStorage przy starcie - tylko raz
    if (!hasAppliedLocal.current) {
      hasAppliedLocal.current = true;
      const savedColor = localStorage.getItem("accentColor") as AccentColorName | null;
      if (savedColor && accentColors.some(c => c.name === savedColor)) {
        applyAccentColor(savedColor);
      }
    }
  }, []);

  useEffect(() => {
    // Załaduj z API gdy użytkownik jest zalogowany - tylko raz
    if (status === "authenticated" && session?.user && !hasFetched.current) {
      hasFetched.current = true;
      fetch("/api/user/settings")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.accentColor && accentColors.some(c => c.name === data.accentColor)) {
            applyAccentColor(data.accentColor);
            localStorage.setItem("accentColor", data.accentColor);
          }
        })
        .catch(() => {});
    }
  }, [session, status]);

  return <>{children}</>;
}

function applyAccentColor(colorName: string) {
  const color = accentColors.find(c => c.name === colorName);
  if (!color) return;

  const root = document.documentElement;
  const isDark = root.classList.contains("dark");

  // Ustaw kolor główny w formacie oklch
  const primaryColor = isDark ? color.oklchDark : color.oklch;
  root.style.setProperty("--primary", `oklch(${primaryColor})`);

  // Kolor foreground
  root.style.setProperty("--primary-foreground", isDark ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)");

  // Ring i sidebar
  root.style.setProperty("--ring", `oklch(${primaryColor})`);
  root.style.setProperty("--sidebar-primary", `oklch(${primaryColor})`);
  root.style.setProperty("--sidebar-primary-foreground", isDark ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)");
  root.style.setProperty("--sidebar-ring", `oklch(${primaryColor})`);
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AccentColorLoader>{children}</AccentColorLoader>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

