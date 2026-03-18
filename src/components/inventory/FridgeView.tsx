"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@prisma/client";
import { differenceInDays } from "date-fns";
import { Refrigerator, Package, Archive, Snowflake } from "lucide-react";

interface FridgeViewProps {
  items: InventoryItem[];
}

const locationIcons = {
  fridge: Refrigerator,
  freezer: Snowflake,
  pantry: Archive,
  cabinet: Package,
  other: Package,
};

const locationLabels: Record<string, string> = {
  fridge: "Lodówka",
  freezer: "Zamrażarka",
  pantry: "Spiżarnia",
  cabinet: "Szafka",
  other: "Inne",
};

const locationColors = {
  fridge: "bg-blue-50 border-blue-200",
  freezer: "bg-cyan-50 border-cyan-200",
  pantry: "bg-amber-50 border-amber-200",
  cabinet: "bg-gray-50 border-gray-200",
  other: "bg-slate-50 border-slate-200",
};

export function FridgeView({ items }: FridgeViewProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Grupuj po lokalizacji
  const itemsByLocation = items.reduce((acc, item) => {
    const location = item.location || "other";
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const getExpiryColor = (expiryDate: Date | null) => {
    if (!expiryDate) return "";
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return "border-red-500 bg-red-50";
    if (days <= 3) return "border-orange-500 bg-orange-50";
    if (days <= 7) return "border-yellow-500 bg-yellow-50";
    return "";
  };

  const getItemSize = (quantity: number) => {
    if (quantity >= 10) return "col-span-2 row-span-2";
    if (quantity >= 5) return "col-span-2";
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Location Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedLocation === null ? "default" : "outline"}
          onClick={() => setSelectedLocation(null)}
          size="sm"
        >
          Wszystkie
        </Button>
        {Object.keys(itemsByLocation).map((location) => {
          const Icon = locationIcons[location as keyof typeof locationIcons];
          return (
            <Button
              key={location}
              variant={selectedLocation === location ? "default" : "outline"}
              onClick={() => setSelectedLocation(location)}
              size="sm"
            >
              <Icon className="h-4 w-4 mr-1" />
              {locationLabels[location]} ({itemsByLocation[location].length})
            </Button>
          );
        })}
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(itemsByLocation)
          .filter(([location]) => !selectedLocation || location === selectedLocation)
          .map(([location, locationItems]) => {
            const Icon = locationIcons[location as keyof typeof locationIcons];

            return (
              <Card
                key={location}
                className={cn("overflow-hidden", locationColors[location as keyof typeof locationColors])}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {locationLabels[location]}
                    <Badge variant="secondary">{locationItems.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {locationItems.map((item) => {
                      const isLowStock = item.minQuantity && item.quantity <= item.minQuantity;
                      const expiryColor = getExpiryColor(item.expiryDate);

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "relative p-3 rounded-lg border-2 bg-white transition-all hover:shadow-md cursor-pointer group",
                            getItemSize(item.quantity),
                            expiryColor,
                            isLowStock && "border-yellow-500"
                          )}
                          title={`${item.name}\n${item.quantity} ${item.unit}`}
                        >
                          {/* Item Image/Icon */}
                          {item.imageUrl ? (
                            <div
                              className="w-full h-16 bg-cover bg-center rounded mb-2"
                              style={{ backgroundImage: `url(${item.imageUrl})` }}
                            />
                          ) : (
                            <div className="w-full h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded mb-2 flex items-center justify-center">
                              <span className="text-3xl">
                                {item.category === "dairy"
                                  ? "🥛"
                                  : item.category === "vegetables"
                                  ? "🥬"
                                  : item.category === "fruits"
                                  ? "🍎"
                                  : item.category === "meat"
                                  ? "🥩"
                                  : "📦"}
                              </span>
                            </div>
                          )}

                          {/* Item Info */}
                          <div className="text-xs font-medium line-clamp-2 mb-1">
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.quantity} {item.unit}
                          </div>

                          {/* Badges */}
                          <div className="absolute top-1 right-1 flex gap-1">
                            {isLowStock && (
                              <Badge variant="destructive" className="text-xs px-1 py-0">
                                !
                              </Badge>
                            )}
                            {expiryColor && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                ⏰
                              </Badge>
                            )}
                          </div>

                          {/* Hover Actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <div className="text-white text-xs text-center p-2">
                              <div className="font-medium">{item.name}</div>
                              <div className="mt-1">
                                {item.quantity} {item.unit}
                              </div>
                              {item.expiryDate && (
                                <div className="mt-1 text-yellow-300">
                                  Ważne: {differenceInDays(new Date(item.expiryDate), new Date())} dni
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {locationItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Icon className="h-12 w-12 mx-auto opacity-20 mb-2" />
                      <p className="text-sm">Brak produktów</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border-2 border-red-500 rounded" />
              <span>Przeterminowane</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border-2 border-orange-500 rounded" />
              <span>Wygasa w 3 dni</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border-2 border-yellow-500 rounded" />
              <span>Niskie zapasy / Wygasa w 7 dni</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

