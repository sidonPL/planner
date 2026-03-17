"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { Bell, CheckCheck, Calendar, CheckSquare, Wallet, Plane, UtensilsCrossed, Users, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Notification } from "@prisma/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

const notificationTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  TASK_REMINDER: { icon: CheckSquare, color: "text-blue-500" },
  TASK_ASSIGNED: { icon: CheckSquare, color: "text-purple-500" },
  EVENT_REMINDER: { icon: Calendar, color: "text-green-500" },
  BUDGET_ALERT: { icon: Wallet, color: "text-red-500" },
  TRIP_REMINDER: { icon: Plane, color: "text-cyan-500" },
  MEAL_REMINDER: { icon: UtensilsCrossed, color: "text-orange-500" },
  PRESENCE_CHANGE: { icon: Users, color: "text-emerald-500" },
  SYSTEM: { icon: Info, color: "text-gray-500" },
};

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=5");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setNotifications(
          notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch {
      toast.error("Nie udało się oznaczyć jako przeczytane");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });

      if (response.ok) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
        toast.success("Wszystkie powiadomienia oznaczone jako przeczytane");
      }
    } catch {
      toast.error("Nie udało się oznaczyć powiadomień");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Powiadomienia</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Powiadomienia</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Oznacz wszystkie
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Ładowanie...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Brak powiadomień
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {notifications.map((notification) => {
              const config = notificationTypeConfig[notification.type] || notificationTypeConfig.SYSTEM;
              const Icon = config.icon;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer",
                    !notification.isRead && "bg-muted/50"
                  )}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: pl,
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </ScrollArea>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="text-center justify-center cursor-pointer">
            Zobacz wszystkie powiadomienia
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

