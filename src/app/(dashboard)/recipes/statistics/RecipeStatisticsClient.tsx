"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeUsageStats } from "@/components/recipes/RecipeUsageStats";
import { UsageCharts } from "@/components/recipes/UsageCharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RecipeStatisticsClient() {
  const [period, setPeriod] = useState("30");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/recipes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Statystyki Przepisów
            </h1>
            <p className="text-muted-foreground">
              Zobacz co gotujesz najczęściej i które składniki są najpopularniejsze
            </p>
          </div>
        </div>

        {/* Okres */}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Ostatnie 7 dni</SelectItem>
            <SelectItem value="30">Ostatnie 30 dni</SelectItem>
            <SelectItem value="90">Ostatnie 90 dni</SelectItem>
            <SelectItem value="365">Ostatni rok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statystyki */}
      <RecipeUsageStats days={parseInt(period)} />
    </div>
  );
}

