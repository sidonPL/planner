// filepath: c:\Users\sidon\IdeaProjects\planner\src\components\ui\breadcrumbs.tsx
"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Mapowanie ścieżek na etykiety
const pathLabels: Record<string, string> = {
  tasks: "Zadania",
  calendar: "Kalendarz",
  shopping: "Zakupy",
  inventory: "Inwentarz",
  recipes: "Przepisy",
  meals: "Jadłospis",
  budget: "Budżet",
  trips: "Wyjazdy",
  schedule: "Harmonogram",
  presence: "Obecność",
  board: "Tablica",
  settings: "Ustawienia",
  notifications: "Powiadomienia",
  gamification: "Gamifikacja",
  stats: "Statystyki",
  categories: "Kategorie",
  new: "Nowy",
};

interface BreadcrumbsProps {
  className?: string;
  items?: BreadcrumbItem[]; // Opcjonalne - jeśli nie podane, generuje automatycznie z URL
  showHome?: boolean;
}

export function Breadcrumbs({ className, items, showHome = true }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Jeśli nie podano items, generuj automatycznie z pathname
  const breadcrumbItems: BreadcrumbItem[] = items || generateBreadcrumbs(pathname);

  if (breadcrumbItems.length === 0 || (breadcrumbItems.length === 1 && pathname === "/")) {
    return null;
  }

  return (
    <nav className={cn("flex items-center text-sm text-muted-foreground", className)}>
      {showHome && (
        <>
          <Link
            href="/"
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbItems.length > 0 && (
            <ChevronRight className="h-4 w-4 mx-2" />
          )}
        </>
      )}

      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div key={item.href || item.label} className="flex items-center">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast && "text-foreground font-medium")}>
                {item.label}
              </span>
            )}

            {!isLast && (
              <ChevronRight className="h-4 w-4 mx-2" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Pomijaj segmenty które są ID (długie ciągi znaków)
    if (segment.length > 20 || /^[a-z0-9]{20,}$/i.test(segment)) {
      continue;
    }

    // Pomijaj segmenty w nawiasach (grupy routingu Next.js jak (dashboard))
    if (segment.startsWith("(") && segment.endsWith(")")) {
      continue;
    }

    const label = pathLabels[segment] || capitalize(segment);
    const isLast = i === segments.length - 1;

    items.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return items;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

