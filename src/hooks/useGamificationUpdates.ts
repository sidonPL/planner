'use client';

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

interface GamificationUpdate {
  type: 'LEVEL_UP' | 'ACHIEVEMENT_UNLOCKED' | 'QUEST_COMPLETED' | 'BADGE_UNLOCKED' | 'XP_GAINED';
  userId: string;
  data: any;
  timestamp: string;
}

export function useGamificationUpdates(householdId?: string, userId?: string) {
  const [updates, setUpdates] = useState<GamificationUpdate[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!householdId) return;

    // Initialize Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    // Subscribe to household gamification channel
    const channel = pusher.subscribe(`household-${householdId}-gamification`);

    // Connection events
    pusher.connection.bind('connected', () => {
      console.log('[Pusher] Connected to gamification updates');
      setConnected(true);
    });

    pusher.connection.bind('disconnected', () => {
      console.log('[Pusher] Disconnected from gamification updates');
      setConnected(false);
    });

    // Listen to gamification events
    channel.bind('level-up', (data: GamificationUpdate) => {
      console.log('[Pusher] Level up:', data);
      setUpdates((prev) => [...prev, { ...data, type: 'LEVEL_UP' }]);

      // Show notification if it's for current user
      if (data.userId === userId) {
        showLevelUpNotification(data.data);
      }
    });

    channel.bind('achievement-unlocked', (data: GamificationUpdate) => {
      console.log('[Pusher] Achievement unlocked:', data);
      setUpdates((prev) => [...prev, { ...data, type: 'ACHIEVEMENT_UNLOCKED' }]);

      if (data.userId === userId) {
        showAchievementNotification(data.data);
      }
    });

    channel.bind('quest-completed', (data: GamificationUpdate) => {
      console.log('[Pusher] Quest completed:', data);
      setUpdates((prev) => [...prev, { ...data, type: 'QUEST_COMPLETED' }]);

      if (data.userId === userId) {
        showQuestCompletedNotification(data.data);
      }
    });

    channel.bind('badge-unlocked', (data: GamificationUpdate) => {
      console.log('[Pusher] Badge unlocked:', data);
      setUpdates((prev) => [...prev, { ...data, type: 'BADGE_UNLOCKED' }]);

      if (data.userId === userId) {
        showBadgeNotification(data.data);
      }
    });

    channel.bind('xp-gained', (data: GamificationUpdate) => {
      console.log('[Pusher] XP gained:', data);
      setUpdates((prev) => [...prev, { ...data, type: 'XP_GAINED' }]);
    });

    // Cleanup
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [householdId, userId]);

  return { updates, connected };
}

// Notification helpers
function showLevelUpNotification(data: { level: number; name: string }) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`🎉 Awans na poziom ${data.level}!`, {
      body: `${data.name} osiągnął poziom ${data.level}!`,
      icon: '/icon-192.png',
    });
  }
}

function showAchievementNotification(data: { name: string; icon: string; xpReward: number }) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`🏆 Osiągnięcie odblokowane!`, {
      body: `${data.icon} ${data.name} (+${data.xpReward} XP)`,
      icon: '/icon-192.png',
    });
  }
}

function showQuestCompletedNotification(data: { title: string; reward: number }) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`✅ Quest ukończony!`, {
      body: `${data.title} (+${data.reward} XP)`,
      icon: '/icon-192.png',
    });
  }
}

function showBadgeNotification(data: { name: string; points: number }) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`🏅 Nowa odznaka!`, {
      body: `${data.name} (+${data.points} punktów)`,
      icon: '/icon-192.png',
    });
  }
}

