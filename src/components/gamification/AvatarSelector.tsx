'use client';

import { useEffect, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AvatarReward {
  id: string;
  isActive: boolean;
  metadata: unknown;
  reward: {
    name: string;
    icon: string;
    category: string;
    effectData?: { avatarUrl?: string };
  };
}

function getAvatarUrl(item: AvatarReward): string | null {
  const effectData = item.reward.effectData;
  if (effectData && typeof effectData === 'object' && typeof effectData.avatarUrl === 'string') {
    return effectData.avatarUrl;
  }
  return null;
}

export function AvatarSelector() {
  const [avatarRewards, setAvatarRewards] = useState<AvatarReward[]>([]);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const initials = useMemo(() => 'U', []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rewardsRes, profileRes] = await Promise.all([
        fetch('/api/gamification/my-rewards'),
        fetch('/api/user/profile'),
      ]);

      if (rewardsRes.ok) {
        const rewardsData = await rewardsRes.json() as { all: AvatarReward[] };
        setAvatarRewards((rewardsData.all || []).filter((r) => r.reward.category === 'AVATAR'));
      }

      if (profileRes.ok) {
        const profile = await profileRes.json() as { avatar?: string | null };
        setCurrentAvatar(profile.avatar || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activateRewardAvatar = async (claimedRewardId: string) => {
    const res = await fetch(`/api/gamification/claimed-rewards/${claimedRewardId}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      toast.error('Nie udalo sie aktywowac avatara');
      return;
    }

    toast.success('Avatar aktywowany');
    window.dispatchEvent(new CustomEvent('cosmetics-updated'));
    await loadData();
  };

  const deactivateRewardAvatar = async (claimedRewardId: string) => {
    const res = await fetch(`/api/gamification/claimed-rewards/${claimedRewardId}/activate`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      toast.error('Nie udalo sie wylaczyc avatara');
      return;
    }

    toast.success('Avatar nagrody wylaczony');
    window.dispatchEvent(new CustomEvent('cosmetics-updated'));
    await loadData();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Ladowanie avatarow...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Aktualny avatar</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={currentAvatar || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            Aktualny avatar ustawisz poniżej z odblokowanych nagród. Własny avatar wgrasz w zakładce Profil.
          </p>
        </CardContent>
      </Card>

      {avatarRewards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {avatarRewards.map((item) => {
            const avatarUrl = getAvatarUrl(item);
            return (
              <Card key={item.id} className={item.isActive ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{item.reward.icon || '🧑'}</span>
                    {item.reward.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback>{item.reward.icon || '🧑'}</AvatarFallback>
                  </Avatar>
                  {!avatarUrl && (
                    <p className="text-xs text-muted-foreground">Ta nagroda nie ma zdefiniowanego URL avatara w effectData.avatarUrl.</p>
                  )}
                  {item.isActive ? (
                    <Button size="sm" variant="outline" onClick={() => deactivateRewardAvatar(item.id)}>
                      Wylacz
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => activateRewardAvatar(item.id)}>
                      Uzyj
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


