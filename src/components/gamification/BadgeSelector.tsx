'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge as UiBadge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BadgeReward {
  id: string;
  isActive: boolean;
  reward: {
    id: string;
    name: string;
    icon: string;
    category: string;
  };
}

export function BadgeSelector() {
  const [badges, setBadges] = useState<BadgeReward[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBadges = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gamification/my-rewards');
      if (!res.ok) return;
      const data = await res.json() as { all: BadgeReward[] };
      setBadges((data.all || []).filter((r) => r.reward.category === 'BADGE'));
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBadges();
  }, []);

  const activate = async (id: string) => {
    const res = await fetch(`/api/gamification/claimed-rewards/${id}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Nie udalo sie aktywowac odznaki' }));
      toast.error(err.error || 'Nie udalo sie aktywowac odznaki');
      return;
    }

    toast.success('Odznaka aktywowana');
    window.dispatchEvent(new CustomEvent('cosmetics-updated'));
    await loadBadges();
  };

  const deactivate = async (id: string) => {
    const res = await fetch(`/api/gamification/claimed-rewards/${id}/activate`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      toast.error('Nie udalo sie wylaczyc odznaki');
      return;
    }

    toast.success('Odznaka wylaczona');
    window.dispatchEvent(new CustomEvent('cosmetics-updated'));
    await loadBadges();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Ladowanie odznak...</p>;
  }

  if (badges.length === 0) {
    return <p className="text-sm text-muted-foreground">Brak odblokowanych odznak z nagrod.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {badges.map((item) => (
        <Card key={item.id} className={item.isActive ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>{item.reward.icon || '🏅'}</span>
              {item.reward.name}
              {item.isActive && <UiBadge variant="default">Aktywna</UiBadge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {item.isActive ? (
              <Button variant="outline" size="sm" onClick={() => deactivate(item.id)}>
                Wylacz
              </Button>
            ) : (
              <Button size="sm" onClick={() => activate(item.id)}>
                Uzyj
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

