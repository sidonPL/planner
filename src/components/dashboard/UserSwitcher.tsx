"use client";

import { useState } from "react";
import { Check, ChevronDown, UserCircle, Pin, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface UserForKiosk {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
  role?: string;
}

interface UserSwitcherProps {
  currentUserId: string;
  activeUserId: string;
  users: UserForKiosk[];
  onUserChange: (userId: string) => void;
  onSetDefault?: (userId: string) => void;
  defaultUserId?: string | null;
  showKioskDialog?: boolean;
}

export function UserSwitcher({
  currentUserId,
  activeUserId,
  users,
  onUserChange,
  onSetDefault,
  defaultUserId,
  showKioskDialog = false,
}: UserSwitcherProps) {
  const [dialogOpen, setDialogOpen] = useState(showKioskDialog);

  // Zabezpieczenie gdy lista użytkowników jest pusta
  const activeUser = users.find((u) => u.id === activeUserId) || users[0] || {
    id: currentUserId,
    name: "Użytkownik",
    avatar: null,
    color: "#6366f1",
  };

  // Jeśli nie ma użytkowników do przełączania, nie pokazuj komponentu
  if (users.length === 0) {
    return null;
  }

  const handleSetDefault = async (userId: string) => {
    if (onSetDefault) {
      onSetDefault(userId);
      toast.success("Ustawiono domyślnego użytkownika dla trybu kiosk");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 pl-2 pr-3 h-auto py-1.5">
            <Avatar
              className="h-8 w-8 border-2"
              style={{ borderColor: activeUser?.color || "#6366f1" }}
            >
              <AvatarImage src={activeUser?.avatar || undefined} />
              <AvatarFallback
                style={{ backgroundColor: activeUser?.color || "#6366f1" }}
                className="text-white text-sm"
              >
                {activeUser?.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium">{activeUser?.name}</p>
              <p className="text-xs text-muted-foreground">
                {activeUserId === currentUserId ? "Zalogowany" : "Tryb kiosk"}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Kto teraz korzysta?
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {users.map((user) => (
            <DropdownMenuItem
              key={user.id}
              onClick={() => onUserChange(user.id)}
              className="gap-3 py-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback
                  style={{ backgroundColor: user.color }}
                  className="text-white text-xs"
                >
                  {user.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.id === currentUserId && "Zalogowany • "}
                  {user.id === defaultUserId && "Domyślny"}
                </p>
              </div>
              {activeUserId === user.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          {onSetDefault && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDialogOpen(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Ustawienia trybu kiosk
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog ustawień trybu kiosk */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tryb kiosk - ustawienia</DialogTitle>
            <DialogDescription>
              Wybierz domyślnego użytkownika, który będzie wyświetlany po
              uruchomieniu trybu kiosk na tablecie lub ekranie rodzinnym.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <p className="text-sm font-medium mb-3">Domyślny użytkownik:</p>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSetDefault(user.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  defaultUserId === user.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback
                    style={{ backgroundColor: user.color }}
                    className="text-white"
                  >
                    {user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.role?.toLowerCase() || "użytkownik"}
                  </p>
                </div>
                {defaultUserId === user.id && (
                  <Pin className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Tip: W trybie kiosk użytkownicy mogą szybko przełączać się bez
            logowania, ale wszystkie akcje są zapisywane jako aktualnie wybrany
            użytkownik.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

