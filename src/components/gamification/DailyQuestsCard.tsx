'use client';

import { useState, useEffect } from 'react';
import { Target, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EnhancedQuestCard } from './EnhancedQuestCard';
import { playQuestComplete } from '@/lib/sound-effects';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface DailyQuest {
  id: string;
  title: string;
  description: string | null;
  type: string;
  target: number;
  reward: number;
  userProgress: number;
  userCompleted: boolean;
}

interface DailyQuestsCardProps {
  isAdmin?: boolean;
  className?: string;
}

export function DailyQuestsCard({ isAdmin = false, className }: DailyQuestsCardProps) {
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previousCompleted, setPreviousCompleted] = useState(0);

  useEffect(() => {
    loadQuests();
  }, []);

  // Sound effect when all quests completed
  useEffect(() => {
    const completedCount = quests.filter((q) => q.userCompleted).length;
    const totalQuests = quests.length;

    if (completedCount === totalQuests && totalQuests > 0 && completedCount > previousCompleted) {
      // All quests just completed!
      playQuestComplete();
    }

    setPreviousCompleted(completedCount);
  }, [quests, previousCompleted]);

  const loadQuests = async () => {
    try {
      const response = await fetch('/api/gamification/daily-quests');
      if (response.ok) {
        const data = await response.json();
        setQuests(data);
      }
    } catch (error) {
      console.error('Error loading daily quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuests = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/gamification/daily-quests', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.created) {
          toast.success(`Wygenerowano ${data.created} nowe questy!`);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          loadQuests();
        } else {
          toast.info(data.message || 'Questy już istnieją na dziś');
        }
      } else {
        toast.error('Nie udało się wygenerować questów');
      }
    } catch (error) {
      console.error('Error generating quests:', error);
      toast.error('Błąd podczas generowania questów');
    } finally {
      setGenerating(false);
    }
  };

  const completedCount = quests.filter((q) => q.userCompleted).length;
  const totalRewards = quests.reduce((sum, q) => sum + (q.userCompleted ? q.reward : 0), 0);
  const totalQuests = quests.length;
  const allCompleted = completedCount === totalQuests && totalQuests > 0;
  const BONUS_XP = 50;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Dzienne zadania
            </CardTitle>
            <CardDescription>
              Resetują się o północy • {completedCount}/{quests.length} ukończonych
            </CardDescription>
          </div>
          {isAdmin && quests.length === 0 && (
            <Button
              onClick={handleGenerateQuests}
              disabled={generating}
              size="sm"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {generating ? 'Generowanie...' : 'Generuj'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Ładowanie...
          </div>
        ) : quests.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {isAdmin
                ? 'Kliknij "Generuj" aby stworzyć dzienne zadania'
                : 'Brak zadań na dziś'}
            </p>
          </div>
        ) : (
          <>
            {/* Bonus Section */}
            {!allCompleted && totalQuests > 0 && (
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎁</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Bonus za ukończenie wszystkich
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {completedCount}/{totalQuests} ukończonych
                    </p>
                  </div>
                  <Badge className="bg-yellow-500">
                    +{BONUS_XP} XP
                  </Badge>
                </div>
                <Progress
                  value={(completedCount / totalQuests) * 100}
                  className="h-2 mt-2"
                />
              </div>
            )}

            {/* All completed celebration */}
            {allCompleted && (
              <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border-2 border-green-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="font-bold text-green-700 dark:text-green-300">
                    Wszystkie ukończone!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Zdobyłeś bonus +{BONUS_XP} XP!
                  </p>
                </div>
              </div>
            )}

            {/* Summary */}
            {completedCount > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600 dark:text-green-400">
                      Ukończono {completedCount} zadań!
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                    +{totalRewards} XP
                  </Badge>
                </div>
              </div>
            )}

            {/* Quests List */}
            <div className="space-y-3">
              {quests.map((quest) => (
                <EnhancedQuestCard
                  key={quest.id}
                  quest={quest}
                  onComplete={loadQuests}
                />
              ))}
            </div>

            {/* All completed bonus */}
            {completedCount === quests.length && quests.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-lg border border-yellow-200 dark:border-yellow-800 text-center">
                <div className="text-2xl mb-2">🎉</div>
                <p className="font-bold text-yellow-700 dark:text-yellow-300">
                  Wszystkie zadania ukończone!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Wróć jutro po nowe wyzwania
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

