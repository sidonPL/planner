"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Home, Users, ArrowRight, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"select" | "create" | "join">("select");

  // Jeśli użytkownik już ma gospodarstwo, przekieruj
  if (session?.user?.householdId) {
    router.push("/");
    return null;
  }

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) {
      toast.error("Podaj nazwę gospodarstwa domowego");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: householdName }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Nie udało się utworzyć gospodarstwa");
        return;
      }

      // Odśwież sesję
      await update();

      toast.success("Gospodarstwo domowe utworzone!");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Podaj kod zaproszenia");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Nie udało się dołączyć do gospodarstwa");
        return;
      }

      // Odśwież sesję
      await update();

      toast.success("Dołączono do gospodarstwa!");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Witaj w Plannerze! 🏠</h1>
            <p className="text-muted-foreground mt-2">
              Aby rozpocząć, utwórz nowe gospodarstwo domowe lub dołącz do istniejącego.
            </p>
          </div>

          <div className="grid gap-4">
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMode("create")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Utwórz gospodarstwo
                </CardTitle>
                <CardDescription>
                  Stwórz nowe gospodarstwo domowe i zaproś rodzinę
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  Rozpocznij
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMode("join")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Dołącz do istniejącego
                </CardTitle>
                <CardDescription>
                  Masz kod zaproszenia? Dołącz do gospodarstwa rodziny
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  Dołącz
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Utwórz gospodarstwo domowe
            </CardTitle>
            <CardDescription>
              Nazwij swoje gospodarstwo - możesz to później zmienić w ustawieniach.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateHousehold} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nazwa gospodarstwa</Label>
                <Input
                  id="name"
                  placeholder="np. Rodzina Kowalskich"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("select")}
                  disabled={isLoading}
                >
                  Wstecz
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Utwórz gospodarstwo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Dołącz do gospodarstwa
            </CardTitle>
            <CardDescription>
              Wprowadź kod zaproszenia otrzymany od członka rodziny.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinHousehold} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kod zaproszenia</Label>
                <Input
                  id="code"
                  placeholder="XXXX-XXXX"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("select")}
                  disabled={isLoading}
                >
                  Wstecz
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Dołącz
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

