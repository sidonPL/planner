/**
 * Sound effects dla systemu gamifikacji
 */

type SoundType =
  | 'task-complete'
  | 'achievement-unlock'
  | 'level-up'
  | 'xp-earn'
  | 'quest-complete'
  | 'streak-maintain'
  | 'confetti';

const sounds: Record<SoundType, string> = {
  'task-complete': '/sounds/task-complete.mp3',
  'achievement-unlock': '/sounds/achievement.mp3',
  'level-up': '/sounds/level-up.mp3',
  'xp-earn': '/sounds/xp.mp3',
  'quest-complete': '/sounds/quest.mp3',
  'streak-maintain': '/sounds/streak.mp3',
  'confetti': '/sounds/confetti.mp3',
};

class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  private constructor() {
    if (typeof window !== 'undefined') {
      // Load preference from localStorage
      const saved = localStorage.getItem('gamification-sound-enabled');
      this.enabled = saved !== 'false'; // Default true

      const savedVolume = localStorage.getItem('gamification-sound-volume');
      this.volume = savedVolume ? parseFloat(savedVolume) : 0.5;
    }
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private initAudioContext() {
    if (typeof window === 'undefined') return;

    if (!this.audioContext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public play(soundType: SoundType, volume?: number) {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      this.initAudioContext();

      const audio = new Audio(sounds[soundType]);
      audio.volume = volume ?? this.volume;

      // Play and handle errors gracefully
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Sound play failed:', error);
        });
      }
    } catch (error) {
      console.warn('Sound error:', error);
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('gamification-sound-enabled', String(enabled));
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp 0-1
    if (typeof window !== 'undefined') {
      localStorage.setItem('gamification-sound-volume', String(this.volume));
    }
  }

  public getVolume(): number {
    return this.volume;
  }
}

/**
 * Hook do używania sound effects
 */
export function useSoundEffects() {
  const soundManager = SoundManager.getInstance();

  return {
    playSound: (soundType: SoundType, volume?: number) => soundManager.play(soundType, volume),
    setEnabled: (enabled: boolean) => soundManager.setEnabled(enabled),
    isEnabled: () => soundManager.isEnabled(),
    setVolume: (volume: number) => soundManager.setVolume(volume),
    getVolume: () => soundManager.getVolume(),
  };
}

/**
 * Helper functions dla convenience
 */
export const playTaskComplete = () => SoundManager.getInstance().play('task-complete');
export const playAchievementUnlock = () => SoundManager.getInstance().play('achievement-unlock', 0.7);
export const playLevelUp = () => SoundManager.getInstance().play('level-up', 0.8);
export const playXPEarn = () => SoundManager.getInstance().play('xp-earn', 0.4);
export const playQuestComplete = () => SoundManager.getInstance().play('quest-complete', 0.6);
export const playStreakMaintain = () => SoundManager.getInstance().play('streak-maintain', 0.5);
export const playConfetti = () => SoundManager.getInstance().play('confetti', 0.6);

