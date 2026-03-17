"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="text-center space-y-6 px-4">
        {/* Animowana ilustracja 404 */}
        <div className="relative">
          <h1 className="text-[150px] md:text-[200px] font-bold text-muted-foreground/20 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-bounce">🏠</div>
          </div>
        </div>

        {/* Tekst */}
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">
            Ups! Strona nie istnieje
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Wygląda na to, że ta strona się zgubiła. Może wróciła do domu wcześniej?
          </p>
        </div>

        {/* Przyciski */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Wróć do dashboardu
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Poprzednia strona
          </Button>
        </div>

        {/* Dodatkowe linki */}
        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            Może szukasz jednej z tych stron?
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks">Zadania</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">Kalendarz</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/shopping">Zakupy</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/recipes">Przepisy</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/budget">Budżet</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

