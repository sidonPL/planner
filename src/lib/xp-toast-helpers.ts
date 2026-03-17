/**
 * Helper do formatowania toastów XP z bonusami
 */

import { toast } from 'sonner';

interface XPToastOptions {
  baseXP: number;
  bonusXP?: number;
  description?: string;
  boostActive?: boolean;
}

/**
 * Pokazuje toast z informacją o zdobytym XP, w tym bonusach z boostów
 */
export function showXPToast({ baseXP, bonusXP = 0, description, boostActive = false }: XPToastOptions) {
  const totalXP = baseXP + bonusXP;

  if (bonusXP > 0 && boostActive) {
    // XP z bonusem - specjalny toast
    toast.success(`⚡ +${totalXP} XP (+${bonusXP} bonus!)`, {
      description: description || "XP Boost aktywny!",
      duration: 3000,
    });
  } else {
    // Zwykłe XP
    toast.success(`+${totalXP} XP`, {
      description: description,
      duration: 2500,
    });
  }
}

/**
 * Sprawdza aktywny boost XP i zwraca informacje
 */
export async function getActiveXPBoost(): Promise<{
  active: boolean;
  multiplier: number;
  expiresAt: Date | null;
} | null> {
  try {
    const response = await fetch('/api/gamification/xp-boost/status');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to load boost status:', error);
  }
  return null;
}

/**
 * Oblicza XP z bonusem
 */
export function calculateXPWithBoost(baseXP: number, multiplier: number = 1.0): {
  totalXP: number;
  bonusXP: number;
  baseXP: number;
} {
  const totalXP = Math.floor(baseXP * multiplier);
  const bonusXP = totalXP - baseXP;

  return {
    totalXP,
    bonusXP,
    baseXP,
  };
}

