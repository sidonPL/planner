'use client';

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StreakShieldStatus {
  active: boolean;
  usesLeft: number;
  maxUses: number;
  expiresAt: Date | null;
}

export function StreakShieldIndicator({ className }: { className?: string }) {
  const [shield, setShield] = useState<StreakShieldStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShieldStatus();
    // Refresh co 60 sekund
    const interval = setInterval(loadShieldStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadShieldStatus = async () => {
    try {
      const response = await fetch('/api/gamification/streak-shield/status');
      if (response.ok) {
        const data = await response.json();
        setShield(data);
      }
    } catch (error) {
      console.error('Error loading shield status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !shield || !shield.active) {
    return null;
  }

  const percentage = (shield.usesLeft / shield.maxUses) * 100;
  const isLowUses = shield.usesLeft === 1;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'relative gap-1.5 cursor-help transition-all duration-300',
              isLowUses && 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
              !isLowUses && 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
              'hover:scale-105',
              className
            )}
          >
            {shield.usesLeft > 0 ? (
              <ShieldCheck className={cn(
                'h-3.5 w-3.5',
                isLowUses && 'animate-pulse'
              )} />
            ) : (
              <Shield className="h-3.5 w-3.5 opacity-50" />
            )}
            <span className="text-xs font-semibold">
              {shield.usesLeft}/{shield.maxUses}
            </span>

            {/* Mini progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-current opacity-20 rounded-full overflow-hidden">
              <div
                className="h-full bg-current transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-center">
            <p className="font-semibold">🛡️ Tarcza Streaku Aktywna!</p>
            <p className="text-xs text-muted-foreground">
              {shield.usesLeft === shield.maxUses && 'Chroni Twój streak przed zerwaniem'}
              {shield.usesLeft > 0 && shield.usesLeft < shield.maxUses && `Pozostało ${shield.usesLeft} ${shield.usesLeft === 1 ? 'użycie' : 'użycia'}`}
              {shield.usesLeft === 0 && 'Tarcza została użyta'}
            </p>
            {shield.expiresAt && (
              <p className="text-xs text-muted-foreground">
                Wygasa: {new Date(shield.expiresAt).toLocaleDateString('pl-PL')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

