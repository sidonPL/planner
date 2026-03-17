"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  CheckSquare,
  Wallet,
  Plane,
  UtensilsCrossed,
  Users,
  Info,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Notification } from "@prisma/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface NotificationsClientProps {
  notifications: Notification[];
  currentUserId: string;
}

const notificationTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  TASK_REMINDER: { icon: CheckSquare, color: "text-blue-500", label: "Zadanie" },
  TASK_ASSIGNED: { icon: CheckSquare, color: "text-purple-500", label: "Przypisanie" },
  EVENT_REMINDER: { icon: Calendar, color: "text-green-500", label: "Wydarzenie" },
  BUDGET_ALERT: { icon: Wallet, color: "text-red-500", label: "Budżet" },
  TRIP_REMINDER: { icon: Plane, color: "text-cyan-500", label: "Wyjazd" },
  MEAL_REMINDER: { icon: UtensilsCrossed, color: "text-orange-500", label: "Posiłek" },
  PRESENCE_CHANGE: { icon: Users, color: "text-emerald-500", label: "Obecność" },
  SYSTEM: { icon: Info, color: "text-gray-500", label: "System" },
};

export function NotificationsClient({ notifications: initialNotifications }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState("all");

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.isRead;
    return true;
  });

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

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotifications(notifications.filter((n) => n.id !== id));
        toast.success("Powiadomienie usunięte");
      }
    } catch {
      toast.error("Nie udało się usunąć powiadomienia");
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch("/api/notifications/clear", {
        method: "DELETE",
      });

      if (response.ok) {
        setNotifications([]);
        toast.success("Wszystkie powiadomienia zostały usunięte");
      }
    } catch {
      toast.error("Nie udało się usunąć powiadomień");
    }
  };

  const getTypeConfig = (type: string) => {
    return notificationTypeConfig[type] || notificationTypeConfig.SYSTEM;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Powiadomienia</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} nieprzeczytanych` : "Brak nowych powiadomień"}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Oznacz wszystkie
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" onClick={handleClearAll}>
              <Trash2 className="mr-2 h-4 w-4" />
              Wyczyść
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Ustawienia
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Wszystkie
            <Badge variant="secondary" className="ml-2">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Nieprzeczytane
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-primary">{unreadCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                {activeTab === "unread" ? (
                  <>
                    <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Brak nieprzeczytanych</h3>
                    <p className="text-muted-foreground">
                      Wszystkie powiadomienia zostały przeczytane
                    </p>
                  </>
                ) : (
                  <>
                    <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Brak powiadomień</h3>
                    <p className="text-muted-foreground">
                      Nie masz żadnych powiadomień
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const config = getTypeConfig(notification.type);
                const Icon = config.icon;

                return (
                  <Card
                    key={notification.id}
                    className={cn(
                      "transition-colors",
                      !notification.isRead && "bg-primary/5 border-primary/20"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn("p-2 rounded-full bg-muted", config.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium">{notification.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  title="Oznacz jako przeczytane"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(notification.id)}
                                title="Usuń"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: pl,
                              })}
                            </span>
                          </div>
                          {notification.link && (
                            <Link
                              href={notification.link}
                              className="text-sm text-primary hover:underline mt-2 inline-block"
                            >
                              Zobacz szczegóły →
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

