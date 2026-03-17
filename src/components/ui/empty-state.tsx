import { cn } from "@/lib/utils";
import { LucideIcon, FileQuestion, Inbox, Search, Calendar, ShoppingCart, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type EmptyStateVariant =
  | "default"
  | "search"
  | "tasks"
  | "calendar"
  | "shopping"
  | "recipes"
  | "members"
  | "notifications"
  | "custom";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const variantConfig: Record<EmptyStateVariant, { icon: LucideIcon; title: string; description: string }> = {
  default: {
    icon: Inbox,
    title: "Brak danych",
    description: "Nie ma jeszcze żadnych elementów do wyświetlenia.",
  },
  search: {
    icon: Search,
    title: "Brak wyników",
    description: "Nie znaleziono elementów pasujących do wyszukiwania. Spróbuj zmienić kryteria.",
  },
  tasks: {
    icon: Inbox,
    title: "Brak zadań",
    description: "Nie masz żadnych zadań. Dodaj pierwsze zadanie, aby rozpocząć!",
  },
  calendar: {
    icon: Calendar,
    title: "Brak wydarzeń",
    description: "Nie ma zaplanowanych wydarzeń na ten okres.",
  },
  shopping: {
    icon: ShoppingCart,
    title: "Lista zakupów jest pusta",
    description: "Dodaj produkty, które chcesz kupić.",
  },
  recipes: {
    icon: Package,
    title: "Brak przepisów",
    description: "Nie masz jeszcze żadnych przepisów. Dodaj swój pierwszy przepis!",
  },
  members: {
    icon: Users,
    title: "Brak członków",
    description: "Zaproś domowników do swojego gospodarstwa.",
  },
  notifications: {
    icon: Inbox,
    title: "Brak powiadomień",
    description: "Nie masz żadnych nowych powiadomień.",
  },
  custom: {
    icon: FileQuestion,
    title: "Brak danych",
    description: "Nie ma jeszcze żadnych elementów.",
  },
};

const sizeClasses = {
  sm: {
    container: "py-6",
    icon: "h-8 w-8",
    iconWrapper: "h-12 w-12",
    title: "text-base",
    description: "text-xs",
  },
  md: {
    container: "py-10",
    icon: "h-10 w-10",
    iconWrapper: "h-16 w-16",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    container: "py-16",
    icon: "h-12 w-12",
    iconWrapper: "h-20 w-20",
    title: "text-xl",
    description: "text-base",
  },
};

export function EmptyState({
  variant = "default",
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;
  const sizes = sizeClasses[size];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizes.container,
      className
    )}>
      {/* Ikona */}
      <div className={cn(
        "rounded-full bg-muted/50 flex items-center justify-center mb-4",
        sizes.iconWrapper
      )}>
        <Icon className={cn("text-muted-foreground", sizes.icon)} />
      </div>

      {/* Tekst */}
      <h3 className={cn("font-semibold mb-1", sizes.title)}>
        {title || config.title}
      </h3>
      <p className={cn("text-muted-foreground max-w-sm", sizes.description)}>
        {description || config.description}
      </p>

      {/* Akcje */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          {action && (
            action.href ? (
              <Button asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button onClick={action.onClick}>{action.label}</Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button variant="outline" asChild>
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

