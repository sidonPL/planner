"use client";

import { useState, useCallback, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, Search, LogOut, User, Settings, Maximize2, Volume2, VolumeX, Cast, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { GoldenStatusBadge } from "@/components/gamification/GoldenStatusBadge";
import { useTTS } from "@/hooks/useTTS";
import { useChromecast } from "@/hooks/useChromecast";
import Link from "next/link";
import { toast } from "sonner";

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTitle, setUserTitle] = useState<string | null>(null);
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

  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const isAdmin = session?.user?.role === "ADMIN";

  // Załaduj tytuł użytkownika
  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/user/profile')
        .then((res) => res.json())
        .then((data) => {
          if (data.activeTitle) {
            setUserTitle(data.activeTitle);
          }
        })
        .catch(() => {});
    }
  }, [session?.user?.id]);

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

  return (
    <>
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 gap-4">
      {/* Mobile menu button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu nawigacji</SheetTitle>
          </SheetHeader>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className="flex-1 max-w-2xl">
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
      <div className="flex items-center gap-2">
        {/* XP Boost Indicator */}
        <XPBoostIndicator />

        {/* Streak Shield Indicator */}
        <StreakShieldIndicator />

        {/* Update indicator */}
        <UpdateIndicator className="mr-2" />

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
        {ttsSupported && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? "Wyłącz głos" : "Włącz głos"}
          >
            {ttsEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Chromecast */}
        {chromecastAvailable && (
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
            className={chromecastConnected ? "text-primary" : ""}
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
        >
          <Maximize2 className="h-5 w-5" />
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Daily Login Rewards */}
        {session?.user && <DailyLoginRewards />}

        {/* Gamification Widget */}
        {session?.user && (
          <div data-tour="gamification-widget">
            <GamificationWidget />
          </div>
        )}

        {/* Notifications */}
        <NotificationDropdown />

        {/* Gamification Tour */}
        {session?.user && <GamificationTour />}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || "User"} />
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

