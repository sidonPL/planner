// Server-side Pusher instance (opcjonalny)
// Wymaga: npm install pusher
// oraz zmiennych środowiskowych w .env

interface InventoryUpdateData {
  item?: unknown;
  itemId?: string;
  userName?: string;
}

// Trigger events
export async function triggerInventoryUpdate(
  householdId: string,
  event: "created" | "updated" | "deleted",
  data: InventoryUpdateData
) {
  try {
    // Dynamiczny import Pusher (tylko jeśli zainstalowany)
    const Pusher = (await import('pusher')).default;

    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID || "",
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
      secret: process.env.PUSHER_SECRET || "",
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
      useTLS: true,
    });

    await pusher.trigger(
      `household-${householdId}`,
      `inventory-${event}`,
      data
    );
  } catch (error) {
    // Pusher nie zainstalowany lub błąd konfiguracji - to OK
    console.warn("Pusher not available. Real-time updates disabled.", error);
  }
}

// Gamification real-time updates
export async function triggerGamificationUpdate(
  householdId: string,
  event: 'level-up' | 'achievement-unlocked' | 'quest-completed' | 'badge-unlocked' | 'xp-gained',
  data: any
) {
  try {
    const Pusher = (await import('pusher')).default;

    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID || "",
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
      secret: process.env.PUSHER_SECRET || "",
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
      useTLS: true,
    });

    await pusher.trigger(
      `household-${householdId}-gamification`,
      event,
      data
    );
  } catch (error) {
    console.warn("Pusher not available for gamification updates.", error);
  }
}

