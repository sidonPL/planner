"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CookingStatsCard } from "@/components/recipes/CookingStatsCard";

export function CookingStatsClient() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/recipes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statystyki gotowania</h1>
          <p className="text-muted-foreground">
            Twoja historia kulinarna i osiągnięcia
          </p>
        </div>
      </div>

      {/* Statystyki */}
      <CookingStatsCard />
    </div>
  );
}

