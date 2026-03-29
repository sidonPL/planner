"use client";

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, Search, LogOut, User, Settings, Maximize2, Volume2, VolumeX, Cast, Shield, X, MoreHorizontal, Sun, Moon, Monitor, Trophy, Gift } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { NotificationDropdown } from "./NotificationDropdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UpdateIndicator } from "@/components/ui/update-indicator";
import { GamificationWidget } from "@/components/gamification/GamificationWidget";
import { DailyLoginRewards } from "@/components/gamification/DailyLoginRewards";
import { GamificationTour } from "@/components/gamification/GamificationTour";
import { XPBoostIndicator } from "@/components/gamification/XPBoostIndicator";
import { UserTitleBadge } from "@/components/gamification/UserTitleBadge";
import { StreakShieldIndicator } from "@/components/gamification/StreakShieldIndicator";
import { useTTS } from "@/hooks/useTTS";
import { useChromecast } from "@/hooks/useChromecast";
import Link from "next/link";
import { toast } from "sonner";

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const headerRef = useRef<HTMLElement | null>(null);
  const [userTitle, setUserTitle] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [activeBadge, setActiveBadge] = useState<{ name: string; icon: string | null } | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { enabled: ttsEnabled, setEnabled: setTtsEnabled, isSupported: ttsSupported } = useTTS();
  const {
    isAvailable: chromecastAvailable,
    isConnected: chromecastConnected,
    isConnecting: chromecastConnecting,
    deviceName: chromecastDevice,
    connect: chromecastConnect,
    disconnect: chromecastDisconnect,
    error: chromecastError,
  } = useChromecast();

  const showTTSControls = mounted && ttsSupported;
  const showChromecastControls = mounted && chromecastAvailable;

  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const isAdmin = session?.user?.role === "ADMIN";

  const loadProfileCosmetics = useCallback(() => {
    if (!session?.user?.id) return;
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        setUserTitle(data.activeTitle || null);
        setProfileAvatar(data.avatar || null);
        if (data.activeBadge?.name) {
          setActiveBadge({
            name: data.activeBadge.name,
            icon: data.activeBadge.icon || null,
          });
        } else {
          setActiveBadge(null);
        }
      })
      .catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => {
    loadProfileCosmetics();
  }, [loadProfileCosmetics]);

  useEffect(() => {
    const handler = () => loadProfileCosmetics();
    window.addEventListener('cosmetics-updated', handler);
    return () => window.removeEventListener('cosmetics-updated', handler);
  }, [loadProfileCosmetics]);

  const handleSearch = useCallback((query?: string) => {
    const trimmedQuery = (query || searchQuery).trim();

    console.log('[Header] Search submitted:', trimmedQuery);

    if (trimmedQuery) {
      // Przekieruj do strony wyszukiwania z query
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
    } else {
      toast.error('Wpisz czego szukasz');
    }
  }, [searchQuery, router]);

  const suggestions = [
    'spaghetti', 'kurczak', 'pizza', 'makaron',
    'zakupy', 'sprzątanie', 'rachunki', 'pranie'
  ];

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const handleChromecast = () => {
    if (chromecastConnected) {
      chromecastDisconnect();
      toast.success("Rozłączono Chromecast");
    } else {
      chromecastConnect();
    }
  };

  // Pokazuj błędy Chromecast tylko gdy się zmienią
  useEffect(() => {
    if (chromecastError) {
      toast.error(chromecastError);
    }
  }, [chromecastError]);

  useEffect(() => {
    const updateHeaderOffset = () => {
      if (!headerRef.current) return;
      const headerHeight = Math.ceil(headerRef.current.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--app-header-offset", `${headerHeight}px`);
    };

    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && headerRef.current) {
      observer = new ResizeObserver(updateHeaderOffset);
      observer.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateHeaderOffset);
      observer?.disconnect();
    };
  }, [searchOpen]);

  return (
    <>
      <header ref={headerRef} className="app-header sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b bg-card px-2 py-2 sm:flex-nowrap sm:gap-3 sm:px-3 md:gap-4 md:px-4">
      {/* Mobile menu button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="mobile-nav-sheet !top-[var(--app-header-offset)] !bottom-auto !h-[calc(100dvh-var(--app-header-offset))] w-72 max-w-[88vw] p-0 sm:!top-0 sm:!bottom-0 sm:!h-full sm:max-w-sm"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu nawigacji</SheetTitle>
          </SheetHeader>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className={`order-3 w-full ${searchOpen ? "block" : "hidden"} sm:order-2 sm:block sm:flex-1 sm:max-w-md md:max-w-2xl`}>
        {searchOpen ? (
          <div className="w-full relative">
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
              <Input
                type="search"
                placeholder="Szukaj czegokolwiek..."
                className="w-full pl-11 pr-10 h-11 text-base shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                title="Zamknij (ESC)"
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
            {/* Propozycje wyszukiwania */}
            {!searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-card border rounded-lg shadow-lg z-50">
                <div className="text-xs text-muted-foreground mb-2 font-medium">Popularne wyszukiwania:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                      className="px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground hidden sm:flex h-11 px-4 border-dashed hover:border-solid hover:bg-accent"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4 mr-3" />
            <span>Szukaj czegokolwiek...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        )}
      </div>

      {/* Right side */}
      <div
        className={`order-2 ml-auto flex max-w-[62vw] items-center gap-1 overflow-x-auto py-1 pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:order-3 sm:max-w-none sm:overflow-visible ${searchOpen ? "hidden sm:flex" : ""}`}
      >
        {/* XP Boost Indicator */}
        <div className="hidden sm:block">
          <XPBoostIndicator />
        </div>

        {/* Streak Shield Indicator */}
        <div className="hidden sm:block">
          <StreakShieldIndicator />
        </div>

        {/* Update indicator */}
        <UpdateIndicator className="mr-0 hidden sm:flex sm:mr-1 md:mr-2" />

        {/* Search button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* TTS toggle */}
        {showTTSControls && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? "Wyłącz głos" : "Włącz głos"}
            className="hidden sm:inline-flex"
          >
            {ttsEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Chromecast */}
        {showChromecastControls && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleChromecast}
            disabled={chromecastConnecting}
            title={
              chromecastConnected
                ? `Połączono z ${chromecastDevice}`
                : "Połącz z Chromecast"
            }
            className={`hidden sm:inline-flex ${chromecastConnected ? "text-primary" : ""}`}
          >
            <Cast className="h-5 w-5" />
          </Button>
        )}

        {/* Fullscreen / Kiosk mode */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          title="Tryb kiosk (pełny ekran)"
          className="hidden sm:inline-flex"
        >
          <Maximize2 className="h-5 w-5" />
        </Button>

        {/* Theme toggle */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* Daily Login Rewards */}
        {session?.user && (
          <div className="hidden sm:block">
            <DailyLoginRewards />
          </div>
        )}

        {/* Gamification Widget */}
        {session?.user && (
          <div data-tour="gamification-widget" className="hidden sm:block">
            <GamificationWidget />
          </div>
        )}

        {/* Mobile more actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden" title="Więcej opcji">
              <MoreHorizontal className="h-5 w-5" />
              <span className="sr-only">Więcej opcji</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 sm:hidden">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Urządzenie
              <span className="block text-[10px] font-normal text-muted-foreground/80">Dźwięk i ekran</span>
            </DropdownMenuLabel>
            {showTTSControls && (
              <DropdownMenuItem onClick={() => setTtsEnabled(!ttsEnabled)}>
                {ttsEnabled ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {ttsEnabled ? "Wyłącz głos" : "Włącz głos"}
              </DropdownMenuItem>
            )}

            {showChromecastControls && (
              <DropdownMenuItem onClick={handleChromecast} disabled={chromecastConnecting}>
                <Cast className="mr-2 h-4 w-4" />
                {chromecastConnected ? "Rozłącz Chromecast" : "Połącz Chromecast"}
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={toggleFullscreen}>
              <Maximize2 className="mr-2 h-4 w-4" />
              Tryb pełnoekranowy
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Wygląd
              <span className="block text-[10px] font-normal text-muted-foreground/80">Motyw aplikacji</span>
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Motyw: jasny
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Motyw: ciemny
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              Motyw: systemowy
            </DropdownMenuItem>

            {session?.user && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Moduły
                  <span className="block text-[10px] font-normal text-muted-foreground/80">Szybkie przejścia</span>
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/gamification" className="cursor-pointer">
                    <Trophy className="mr-2 h-4 w-4" />
                    Gamifikacja
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/rewards" className="cursor-pointer">
                    <Gift className="mr-2 h-4 w-4" />
                    Nagrody
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Gamification Tour */}
        {session?.user && <GamificationTour />}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profileAvatar || session?.user?.image || undefined} alt={session?.user?.name || "User"} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name}
                  </p>
                  {userTitle && (
                    <UserTitleBadge title={userTitle} size="sm" />
                  )}
                  {activeBadge && (
                    <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                      <span>{activeBadge.icon || '🏅'}</span>
                      <span>{activeBadge.name}</span>
                    </Badge>
                  )}
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-medium">Panel Admina</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Ustawienia
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Wyloguj się
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  </>
  );
}

