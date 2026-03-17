import "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      householdId: string | null;
      // Gamification fields
      level?: number;
      xp?: number;
      currentStreak?: number;
      longestStreak?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: UserRole;
    householdId: string | null;
    // Gamification fields
    level?: number;
    xp?: number;
    currentStreak?: number;
    longestStreak?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    householdId: string | null;
    // Gamification fields
    level?: number;
    xp?: number;
    currentStreak?: number;
    longestStreak?: number;
  }
}

