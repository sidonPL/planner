"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  householdId: string | null;
}

interface UseCurrentUserReturn {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasHousehold: boolean;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const { data: session, status } = useSession();

  const user = useMemo(() => {
    if (!session?.user) return null;

    return {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || null,
      avatar: session.user.image || null,
      role: session.user.role || "MEMBER",
      householdId: session.user.householdId || null,
    } as CurrentUser;
  }, [session]);

  return {
    user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated" && !!session?.user,
    hasHousehold: !!session?.user?.householdId,
  };
}

// Hook do pobierania tylko ID użytkownika (lżejszy)
export function useCurrentUserId(): string | null {
  const { data: session } = useSession();
  return session?.user?.id || null;
}

// Hook do sprawdzania czy użytkownik jest adminem
export function useIsAdmin(): boolean {
  const { data: session } = useSession();
  return session?.user?.role === "ADMIN";
}

// Hook do sprawdzania uprawnień
export function useHasPermission(permission: "admin" | "member"): boolean {
  const { data: session } = useSession();

  if (!session?.user) return false;
  if (permission === "admin") return session.user.role === "ADMIN";
  return true; // member permission - każdy zalogowany
}

