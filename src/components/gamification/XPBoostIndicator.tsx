'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XPBoostIndicatorProps {
  className?: string;
}

interface BoostStatus {
  active: boolean;
  multiplier: number;
  expiresAt: Date | null;
}

export function XPBoostIndicator({ className }: XPBoostIndicatorProps) {
  const [boost, setBoost] = useState<BoostStatus | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const loadBoostStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/xp-boost/status');
      if (response.ok) {
        const data = await response.json();
        setBoost(data);
      }
    } catch (error) {
      console.error('Failed to load boost status:', error);
    }
  }, []);

  useEffect(() => {
    const loadAndSet = async () => {
      await loadBoostStatus();
    };
    loadAndSet();
    const interval = setInterval(() => {
      loadAndSet();
    }, 60000); // Odświeżaj co minutę
    return () => clearInterval(interval);
  }, [loadBoostStatus]);

  useEffect(() => {
    if (!boost?.active || !boost.expiresAt) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const expires = new Date(boost.expiresAt!);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Wygasł');
        void loadBoostStatus(); // Odśwież status
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 30000); // Aktualizuj co 30s
    return () => clearInterval(interval);
  }, [boost, loadBoostStatus]);

  if (!boost?.active) return null;

  const bonusPercent = Math.round((boost.multiplier - 1) * 100);

  return (
    <Badge
      variant="default"
      className={cn(
        'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600',
        'animate-pulse shadow-lg cursor-help',
        className
      )}
      title={`XP Boost aktywny: +${bonusPercent}%${timeLeft ? ` • Pozostało: ${timeLeft}` : ''}`}
    >
      <Zap className="h-3 w-3 mr-1 fill-current" />
      +{bonusPercent}% XP
      {timeLeft && (
        <span className="ml-1.5 text-xs opacity-90">• {timeLeft}</span>
      )}
    </Badge>
  );
}

