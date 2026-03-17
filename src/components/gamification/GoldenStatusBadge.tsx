'use client';

import { useEffect, useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GoldenStatusBadgeProps {
  className?: string;
}

export function GoldenStatusBadge({ className }: GoldenStatusBadgeProps) {
  const [hasGoldenStatus, setHasGoldenStatus] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);

  const loadGoldenStatus = async () => {
    try {
      const response = await fetch('/api/gamification/xp-boost/status');
      if (response.ok) {
        const data = await response.json();
        // Golden status = permanent boost (no expiry)
        if (data.active && !data.expiresAt && data.multiplier > 1.0) {
          setHasGoldenStatus(true);
          setMultiplier(data.multiplier);
        }
      }
    } catch (error) {
      console.error('Failed to load golden status:', error);
    }
  };

  useEffect(() => {
    loadGoldenStatus();
  }, []);

  if (!hasGoldenStatus) return null;

  const bonusPercent = Math.round((multiplier - 1) * 100);

  return (
    <Badge
      variant="default"
      className={cn(
        'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600 text-white',
        'shadow-lg border-2 border-yellow-300',
        'animate-pulse cursor-help',
        className
      )}
      title={`Złoty Status: Permanentny +${bonusPercent}% XP!`}
    >
      <Crown className="h-3 w-3 mr-1 fill-current" />
      <Sparkles className="h-3 w-3 mr-1" />
      Złoty Status
    </Badge>
  );
}

