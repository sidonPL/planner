"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Home,
  CheckSquare,
  Calendar,
  Cake,
  ShoppingCart,
  UtensilsCrossed,
  BookOpen,
  Wallet,
  MapPin,
  Users,
  Bell,
  Settings,
  MessageSquare,
  Clock,
  Trophy,
  Package,
  BarChart3,
  Landmark,
  Shield,
  Award,
  Gift,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Zadania", href: "/tasks", icon: CheckSquare },
  { name: "Kalendarz", href: "/calendar", icon: Calendar },
  { name: "Urodziny", href: "/birthdays", icon: Cake },
  { name: "Harmonogram", href: "/schedule", icon: Clock },
  { name: "Zakupy", href: "/shopping", icon: ShoppingCart },
  { name: "Zapasy", href: "/inventory", icon: Package },
  { name: "Jadłospis", href: "/meals", icon: UtensilsCrossed },
  { name: "Przepisy", href: "/recipes", icon: BookOpen },
  { name: "Budżet", href: "/budget", icon: Wallet },
  { name: "Majątek", href: "/financial-accounts", icon: Landmark },
  { name: "Wyjazdy", href: "/trips", icon: MapPin },
  { name: "Obecność", href: "/presence", icon: Users },
  { name: "Tablica", href: "/board", icon: MessageSquare },
  { name: "Gamifikacja", href: "/gamification", icon: Trophy },
  { name: "Osiągnięcia", href: "/achievements", icon: Award },
  { name: "Nagrody", href: "/rewards", icon: Gift },
  { name: "Raporty", href: "/reports", icon: BarChart3 },
  { name: "Powiadomienia", href: "/notifications", icon: Bell },
];

const bottomNavigation = [
  { name: "Ustawienia", href: "/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-card border-r",
        className
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="p-2 bg-primary rounded-lg">
            <Home className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Planner</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t space-y-1">
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2",
              pathname.startsWith("/admin")
                ? "bg-primary text-primary-foreground"
                : "text-primary hover:bg-primary/10"
            )}
          >
            <Shield className="w-5 h-5" />
            Panel Admina
          </Link>
        )}
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

