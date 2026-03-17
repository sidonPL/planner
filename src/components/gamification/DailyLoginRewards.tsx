'use client';

import { useState, useEffect } from 'react';
import { Gift, Flame, TrendingUp, Calendar, Sparkles, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CountingNumber } from '@/components/ui/counting-number';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface DailyLoginStats {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: Date | null;
  totalLogins: number;
  totalXpEarned: number;
}

interface ClaimResult {
  alreadyClaimed: boolean;
  streak: number;
  xpRewarded: number;
  bonusType: string | null;
  shieldUsed?: boolean;
  shieldInfo?: { usesLeft: number; maxUses: number } | null;
  isNewRecord: boolean;
  totalXp: number;
}

/**
 * Daily Login Rewards Dialog
 * Shows streak, rewards, and claim button
 */
export function DailyLoginRewards() {
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [stats, setStats] = useState<DailyLoginStats | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/gamification/daily-login');
      if (response.ok) {
        const data = await response.json();
        setCanClaim(data.canClaim);
        setStats(data.stats);

        // Auto-open if can claim
        if (data.canClaim) {
          setOpen(true);
        }
      }
    } catch (error) {
      console.error('Error loading daily login status:', error);
    }
  };

  const handleClaim = async () => {
    try {
      setClaiming(true);
      const response = await fetch('/api/gamification/daily-login', {
        method: 'POST',
      });

      if (response.ok) {
        const result: ClaimResult = await response.json();

        if (result.alreadyClaimed) {
          toast.info('Już odebrałeś dzisiejszą nagrodę! 🎁');
          setOpen(false);
          return;
        }

        setClaimResult(result);
        setShowReward(true);
        setCanClaim(false);

        // Confetti effect!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        // Success toast
        if (result.shieldUsed) {
          toast.success(
            `🛡️ Tarcza Serii Użyta!`,
            {
              description: `Seria zachowana: ${result.streak} dni${result.shieldInfo ? ` (${result.shieldInfo.usesLeft}/${result.shieldInfo.maxUses} użyć pozostało)` : ''}`,
            }
          );
        } else if (result.bonusType) {
          toast.success(
            `🔥 Seria ${result.streak} dni! Bonus +${result.xpRewarded} XP!`,
            {
              description: result.isNewRecord
                ? '🏆 Nowy rekord serii!'
                : undefined,
            }
          );
        } else {
          toast.success(`+${result.xpRewarded} XP za codzienne logowanie! 🎁`);
        }

        // Reload stats
        await loadStatus();

        // Dispatch event to update other components
        window.dispatchEvent(new Event('gamification:update'));
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Nie udało się odebrać nagrody');
    } finally {
      setClaiming(false);
    }
  };

  const getStreakMilestone = (streak: number) => {
    if (streak >= 30) return { next: Math.ceil(streak / 30) * 30, reward: 200 };
    if (streak >= 14) return { next: 30, reward: 200 };
    if (streak >= 7) return { next: 14, reward: 100 };
    if (streak >= 3) return { next: 7, reward: 50 };
    return { next: 3, reward: 20 };
  };

  const milestone = stats ? getStreakMilestone(stats.currentStreak) : null;
  const progressToNext = milestone
    ? (stats!.currentStreak / milestone.next) * 100
    : 0;

  return (
    <>
      {/* Trigger Button */}
      <div data-tour="daily-login">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="relative"
        >
          <Gift className="h-5 w-5" />
          {canClaim && (
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </div>

      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-500" />
              Codzienna Nagroda
            </DialogTitle>
            <DialogDescription>
              Zaloguj się codziennie aby zdobywać bonus XP i utrzymać serię!
            </DialogDescription>
          </DialogHeader>

          {!showReward ? (
            <div className="space-y-6">
              {/* Current Streak */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Flame className="h-8 w-8 text-orange-500" />
                  <div>
                    <div className="text-4xl font-bold">
                      {stats?.currentStreak || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Dni z rzędu
                    </div>
                  </div>
                </div>

                {stats && stats.currentStreak > 0 && milestone && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Do kolejnego bonusu:</span>
                      <span className="font-medium">
                        {milestone.next - stats.currentStreak} dni
                      </span>
                    </div>
                    <Progress value={progressToNext} className="h-2" />
                    <div className="text-xs text-muted-foreground text-center">
                      Nagroda: +{milestone.reward} XP
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center space-y-1">
                  <TrendingUp className="h-5 w-5 mx-auto text-blue-500" />
                  <div className="text-2xl font-bold">
                    {stats?.longestStreak || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Rekord serii
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <Calendar className="h-5 w-5 mx-auto text-green-500" />
                  <div className="text-2xl font-bold">
                    {stats?.totalLogins || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Logowań
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <Sparkles className="h-5 w-5 mx-auto text-yellow-500" />
                  <div className="text-2xl font-bold">
                    {stats?.totalXpEarned || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total XP
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Nagrody za serie:</div>
                <div className="grid grid-cols-2 gap-2">
                  <Badge
                    variant={
                      stats && stats.currentStreak >= 3
                        ? 'default'
                        : 'outline'
                    }
                  >
                    3 dni: +20 XP
                  </Badge>
                  <Badge
                    variant={
                      stats && stats.currentStreak >= 7
                        ? 'default'
                        : 'outline'
                    }
                  >
                    7 dni: +50 XP
                  </Badge>
                  <Badge
                    variant={
                      stats && stats.currentStreak >= 14
                        ? 'default'
                        : 'outline'
                    }
                  >
                    14 dni: +100 XP
                  </Badge>
                  <Badge
                    variant={
                      stats && stats.currentStreak >= 30
                        ? 'default'
                        : 'outline'
                    }
                  >
                    30 dni: +200 XP
                  </Badge>
                </div>
              </div>

              {/* Claim Button */}
              <Button
                onClick={handleClaim}
                disabled={!canClaim || claiming}
                className="w-full"
                size="lg"
              >
                {claiming ? (
                  'Odbieranie...'
                ) : canClaim ? (
                  <>
                    <Gift className="h-5 w-5 mr-2" />
                    Odbierz nagrodę!
                  </>
                ) : (
                  'Już odebrano dzisiaj ✓'
                )}
              </Button>
            </div>
          ) : (
            /* Reward Screen */
            <div className="text-center space-y-6 py-6">
              {claimResult?.shieldUsed ? (
                /* Shield Used Animation */
                <>
                  <div className="flex justify-center">
                    <div className="relative">
                      <Shield className="h-24 w-24 text-blue-500 animate-pulse" />
                      <Sparkles className="h-8 w-8 text-yellow-500 absolute -top-2 -right-2 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">🛡️ Tarcza Użyta!</h3>
                    <p className="text-muted-foreground">
                      Twoja seria została uratowana!
                    </p>
                  </div>

                  <div className="text-5xl font-bold text-blue-500">
                    Seria: {claimResult.streak} dni 🔥
                  </div>

                  {claimResult.shieldInfo && (
                    <Badge variant="outline" className="text-base px-4 py-2">
                      {claimResult.shieldInfo.usesLeft > 0
                        ? `Pozostało ${claimResult.shieldInfo.usesLeft}/${claimResult.shieldInfo.maxUses} użyć`
                        : 'Ostatnie użycie tarczy'}
                    </Badge>
                  )}
                </>
              ) : (
                /* Normal Reward */
                <>
                  <div className="flex justify-center">
                    <div className="relative">
                      <Gift className="h-24 w-24 text-purple-500 animate-bounce" />
                      <Sparkles className="h-8 w-8 text-yellow-500 absolute -top-2 -right-2 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Gratulacje!</h3>
                    <p className="text-muted-foreground">
                      {claimResult?.bonusType
                        ? `Seria ${claimResult.streak} dni! 🔥`
                        : 'Codzienne logowanie'}
                    </p>
                  </div>

                  <div className="text-6xl font-bold text-purple-500">
                    +<CountingNumber value={claimResult?.xpRewarded || 0} /> XP
                  </div>

                  {claimResult?.isNewRecord && (
                    <Badge variant="default" className="text-lg px-4 py-2">
                      🏆 Nowy rekord serii!
                    </Badge>
                  )}
                </>
              )}

              <Button
                onClick={() => {
                  setShowReward(false);
                  setOpen(false);
                }}
                className="w-full"
                size="lg"
              >
                Wspaniale!
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

