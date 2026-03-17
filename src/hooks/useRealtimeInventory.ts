"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Typy dla Pusher (jeśli nie zainstalowany, używamy any z komentarzem)
type PusherInstance = any; // TODO: Install pusher-js and use proper types
type ChannelInstance = any;

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string | null;
  location: string | null;
}

interface RealtimeEventData {
  item: InventoryItem;
  itemId?: string;
  userName?: string;
}

interface UseRealtimeInventoryOptions {
  householdId: string | null;
  onItemCreated?: (item: InventoryItem) => void;
  onItemUpdated?: (item: InventoryItem) => void;
  onItemDeleted?: (itemId: string) => void;
  enabled?: boolean;
}

export function useRealtimeInventory({
  householdId,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
  enabled = true,
}: UseRealtimeInventoryOptions) {
  const pusherRef = useRef<PusherInstance | null>(null);
  const channelRef = useRef<ChannelInstance | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !householdId) return;

    // Check if Pusher is available
    if (typeof window === 'undefined') return;

    // Dynamically import Pusher only if available
    const initPusher = async () => {
      try {
        const Pusher = (await import('pusher-js')).default;

        // Initialize Pusher
        if (!pusherRef.current) {
          pusherRef.current = new Pusher(
            process.env.NEXT_PUBLIC_PUSHER_KEY || "",
            {
              cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
            }
          );

          // Enable logging in development
          if (process.env.NODE_ENV === "development") {
            Pusher.logToConsole = true;
          }
        }

        // Subscribe to household channel
        const channelName = `household-${householdId}`;
        channelRef.current = pusherRef.current.subscribe(channelName);

        // Bind events
        channelRef.current.bind("inventory-created", (data: RealtimeEventData) => {
          console.log("Inventory created:", data);
          onItemCreated?.(data.item);
          toast.info(`${data.userName || "Ktoś"} dodał "${data.item.name}"`);
        });

        channelRef.current.bind("inventory-updated", (data: RealtimeEventData) => {
          console.log("Inventory updated:", data);
          onItemUpdated?.(data.item);
          toast.info(`${data.userName || "Ktoś"} zaktualizował "${data.item.name}"`);
        });

        channelRef.current.bind("inventory-deleted", (data: RealtimeEventData) => {
          console.log("Inventory deleted:", data);
          if (data.itemId) {
            onItemDeleted?.(data.itemId);
          }
          toast.info(`${data.userName || "Ktoś"} usunął produkt`);
        });

        // Connection status
        pusherRef.current.connection.bind("connected", () => {
          console.log("Pusher connected");
          setConnected(true);
        });

        pusherRef.current.connection.bind("disconnected", () => {
          console.log("Pusher disconnected");
          setConnected(false);
        });
      } catch (error) {
        console.warn("Pusher not available. Real-time updates disabled.", error);
        // Pusher nie jest zainstalowany - to OK, feature jest opcjonalny
      }
    };

    void initPusher();

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        const channelName = `household-${householdId}`;
        pusherRef.current?.unsubscribe(channelName);
      }
    };
  }, [householdId, enabled, onItemCreated, onItemUpdated, onItemDeleted]);

  return {
    connected,
    disconnect: () => pusherRef.current?.disconnect(),
  };
}

