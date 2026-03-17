'use client';

import { useState, useEffect } from 'react';
import { Trophy, Target, Users, Calendar, Award, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import confetti from 'canvas-confetti';

interface Participant {
  id: string;
  progress: number;
  completed: boolean;
  completedAt: Date | null;
  rewardClaimed: boolean;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
  };
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  reward: number;
  icon: string;
  weekStart: Date;
  weekEnd: Date;
  participants: Participant[];
}

interface WeeklyChallengesProps {
  currentUserId: string;
  isAdmin?: boolean;
}

export function WeeklyChallenges({ currentUserId, isAdmin = false }: WeeklyChallengesProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingNew, setGeneratingNew] = useState(false);

  const loadChallenges = async () => {
    try {
      const response = await fetch('/api/gamification/challenges');
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.map((c: Challenge) => ({
          ...c,
          weekStart: new Date(c.weekStart),
          weekEnd: new Date(c.weekEnd),
        })));
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const handleGenerateNew = async () => {
    setGeneratingNew(true);
    try {
      const response = await fetch('/api/gamification/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0 }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Wygenerowano ${data.created} nowe wyzwania!`);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        loadChallenges();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Nie udało się wygenerować wyzwań');
      }
    } catch (error) {
      console.error('Error generating challenges:', error);
      toast.error('Błąd podczas generowania wyzwań');
    } finally {
      setGeneratingNew(false);
    }
  };

  const handleClaimReward = async (challengeId: string) => {
    try {
      const response = await fetch(`/api/gamification/challenges/${challengeId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Odebrano nagrodę!');
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });
        loadChallenges();
      } else {
        toast.error('Nie udało się odebrać nagrody');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Błąd podczas odbierania nagrody');
    }
  };

  const getMyParticipation = (challenge: Challenge) => {
    return challenge.participants.find((p) => p.user.id === currentUserId);
  };

  const getChallengeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      TASKS: 'bg-blue-500',
      ROUTINES: 'bg-orange-500',
      RECIPES: 'bg-green-500',
      SHOPPING: 'bg-purple-500',
      MEALS: 'bg-pink-500',
      BUDGET: 'bg-yellow-500',
      FAMILY: 'bg-red-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Ładowanie wyzwań...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Wyzwania Tygodniowe
          </h2>
          <p className="text-muted-foreground">
            Ukończ wyzwania i zdobywaj punkty!
          </p>
        </div>
        {isAdmin && challenges.length === 0 && (
          <Button onClick={handleGenerateNew} disabled={generatingNew}>
            <Sparkles className="mr-2 h-4 w-4" />
            {generatingNew ? 'Generowanie...' : 'Generuj wyzwania'}
          </Button>
        )}
      </div>

      {/* Challenges Grid */}
      {challenges.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Brak wyzwań na ten tydzień</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin
                ? 'Kliknij "Generuj wyzwania" aby stworzyć nowe wyzwania'
                : 'Poczekaj aż administrator wygeneruje wyzwania'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => {
            const myParticipation = getMyParticipation(challenge);
            const progressPercent = myParticipation
              ? Math.min(100, (myParticipation.progress / challenge.target) * 100)
              : 0;

            return (
              <Card
                key={challenge.id}
                className={myParticipation?.completed ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{challenge.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <Badge className={getChallengeTypeColor(challenge.type)} variant="secondary">
                          {challenge.type}
                        </Badge>
                      </div>
                    </div>
                    {myParticipation?.completed && (
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    )}
                  </div>
                  <CardDescription>{challenge.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        Postęp
                      </span>
                      <span className="font-semibold">
                        {myParticipation?.progress || 0} / {challenge.target}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  {/* Reward */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Award className="h-4 w-4" />
                      Nagroda
                    </span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-500">
                      +{challenge.reward} pkt
                    </span>
                  </div>

                  {/* Time remaining */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Czas
                    </span>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(challenge.weekEnd, {
                        addSuffix: true,
                        locale: pl,
                      })}
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Uczestnicy
                    </span>
                    <div className="flex -space-x-2">
                      {challenge.participants.slice(0, 5).map((p) => (
                        <div
                          key={p.id}
                          className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold text-white"
                          style={{ backgroundColor: p.user.color }}
                          title={p.user.name || 'Użytkownik'}
                        >
                          {p.user.name?.[0] || '?'}
                        </div>
                      ))}
                      {challenge.participants.length > 5 && (
                        <div className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs bg-gray-300 dark:bg-gray-700">
                          +{challenge.participants.length - 5}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Claim Reward Button */}
                  {myParticipation?.completed && !myParticipation.rewardClaimed && (
                    <Button
                      className="w-full"
                      onClick={() => handleClaimReward(challenge.id)}
                    >
                      <Award className="mr-2 h-4 w-4" />
                      Odbierz nagrodę
                    </Button>
                  )}

                  {myParticipation?.rewardClaimed && (
                    <div className="text-center text-sm text-green-600 dark:text-green-400 font-semibold">
                      ✅ Nagroda odebrana!
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Leaderboard */}
      {challenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ranking Tygodnia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                // Oblicz ranking
                const userScores = new Map<string, { name: string; color: string; score: number; completed: number }>();

                challenges.forEach((challenge) => {
                  challenge.participants.forEach((p) => {
                    const existing = userScores.get(p.user.id) || {
                      name: p.user.name || 'Użytkownik',
                      color: p.user.color,
                      score: 0,
                      completed: 0,
                    };
                    existing.score += (p.progress / challenge.target) * challenge.reward;
                    if (p.completed) existing.completed++;
                    userScores.set(p.user.id, existing);
                  });
                });

                const ranked = Array.from(userScores.entries())
                  .map(([userId, data]) => ({ userId, ...data }))
                  .sort((a, b) => b.score - a.score);

                return ranked.map((user, index) => (
                  <div
                    key={user.userId}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      user.userId === currentUserId ? 'bg-primary/10 border border-primary' : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-muted-foreground w-8">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.completed} ukończonych
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-yellow-600 dark:text-yellow-500">
                        {Math.round(user.score)} pkt
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

