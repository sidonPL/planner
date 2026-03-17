"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TierBadgeProps {
  tier: number | null | undefined;
  tierName?: string | null;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

const tierConfig = {
  1: {
    name: "Bronze",
    color: "from-amber-700 via-amber-600 to-amber-800",
    textColor: "text-amber-100",
    emoji: "🥉",
  },
  2: {
    name: "Silver",
    color: "from-gray-400 via-gray-300 to-gray-500",
    textColor: "text-gray-800",
    emoji: "🥈",
  },
  3: {
    name: "Gold",
    color: "from-yellow-400 via-yellow-300 to-yellow-500",
    textColor: "text-yellow-900",
    emoji: "🥇",
  },
  4: {
    name: "Platinum",
    color: "from-cyan-400 via-blue-400 to-purple-400",
    textColor: "text-white",
    emoji: "💎",
  },
};

export function TierBadge({ tier, tierName, size = "md", showName = true }: TierBadgeProps) {
  if (!tier || tier < 1 || tier > 4) {
    return null;
  }

  const config = tierConfig[tier as keyof typeof tierConfig];
  const displayName = tierName || config.name;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <Badge
      className={cn(
        "bg-gradient-to-r font-bold border-0 shadow-sm",
        config.color,
        config.textColor,
        sizeClasses[size]
      )}
    >
      <span className="mr-1">{config.emoji}</span>
      {showName && displayName}
    </Badge>
  );
}

interface TierProgressProps {
  currentTier: number;
  totalTiers: number;
  seriesName: string;
}

/**
 * Shows progression through tiers (Bronze → Silver → Gold → Platinum)
 */
export function TierProgress({ currentTier, totalTiers, seriesName }: TierProgressProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">{seriesName}</div>
      <div className="flex items-center gap-2">
        {Array.from({ length: totalTiers }, (_, i) => i + 1).map((tier) => {
          const config = tierConfig[tier as keyof typeof tierConfig];
          const isCompleted = tier < currentTier;
          const isCurrent = tier === currentTier;
          const isLocked = tier > currentTier;

          return (
            <div
              key={tier}
              className={cn(
                "flex flex-col items-center gap-1 flex-1",
                isLocked && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                  isCompleted && "bg-gradient-to-br " + config.color,
                  isCurrent && "bg-gradient-to-br " + config.color + " ring-2 ring-primary ring-offset-2",
                  isLocked && "bg-muted"
                )}
              >
                {isLocked ? "🔒" : config.emoji}
              </div>
              <span className="text-xs font-medium">{config.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Mini badge for achievement list
 */
export function TierBadgeMini({ tier }: { tier: number | null | undefined }) {
  if (!tier || tier < 1 || tier > 4) {
    return null;
  }

  const config = tierConfig[tier as keyof typeof tierConfig];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs",
        "bg-gradient-to-br " + config.color
      )}
      title={config.name}
    >
      {config.emoji}
    </span>
  );
}

