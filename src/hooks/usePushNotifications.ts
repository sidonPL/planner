"use client";

import { useState, useEffect, useCallback } from "react";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Sprawdź wsparcie i status przy montowaniu
  useEffect(() => {
    const checkSupport = async () => {
      // Sprawdź czy przeglądarka wspiera push notifications
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);

      if (!supported) {
        setIsLoading(false);
        return;
      }

      // Pobierz aktualną permisję
      setPermission(Notification.permission);

      try {
        // Zarejestruj Service Worker
        const reg = await navigator.serviceWorker.register("/sw.js");
        setRegistration(reg);

        // Sprawdź czy użytkownik jest już zasubskrybowany
        const subscription = await reg.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error("Error registering service worker:", error);
      }

      setIsLoading(false);
    };

    checkSupport();
  }, []);

  // Poproś o permisję
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return "denied";
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  // Subskrybuj do powiadomień push
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !registration) {
      return false;
    }

    setIsLoading(true);

    try {
      // Najpierw poproś o permisję jeśli trzeba
      if (Notification.permission !== "granted") {
        const result = await requestPermission();
        if (result !== "granted") {
          setIsLoading(false);
          return false;
        }
      }

      // Pobierz klucz publiczny VAPID z serwera
      const response = await fetch("/api/push/subscribe");
      if (!response.ok) {
        console.error("Failed to get VAPID public key");
        setIsLoading(false);
        return false;
      }
      const { publicKey } = await response.json();

      // Konwertuj klucz na Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Utwórz subskrypcję
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Wyślij subskrypcję do serwera
      const saveResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!saveResponse.ok) {
        console.error("Failed to save subscription");
        setIsLoading(false);
        return false;
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, registration, requestPermission]);

  // Wypisz się z powiadomień push
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !registration) {
      return false;
    }

    setIsLoading(true);

    try {
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Usuń subskrypcję z serwera
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Usuń subskrypcję w przeglądarce
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, registration]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// Pomocnicza funkcja do konwersji klucza VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

