import type { UserRole } from "@prisma/client";

// Uprawnienia dla różnych ról
export const rolePermissions: Record<UserRole, string[]> = {
  ADMIN: [
    "manage_household",
    "manage_users",
    "manage_roles",
    "view_all_data",
    "edit_all_data",
    "delete_all_data",
    "manage_budget",
    "manage_settings",
    "export_data",
  ],
  USER: [
    "view_all_data",
    "edit_own_data",
    "manage_own_tasks",
    "manage_own_events",
    "view_budget",
    "add_transactions",
    "manage_shopping",
    "manage_inventory",
    "manage_meals",
    "manage_recipes",
    "manage_presence",
  ],
  CHILD: [
    "view_own_data",
    "manage_own_tasks",
    "view_calendar",
    "view_meals",
    "view_shopping",
    "mark_tasks_complete",
  ],
};

// Sprawdź czy rola ma dane uprawnienie
export function hasPermission(role: UserRole, permission: string): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Sprawdź czy rola ma którekolwiek z podanych uprawnień
export function hasAnyPermission(role: UserRole, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

// Sprawdź czy rola ma wszystkie podane uprawnienia
export function hasAllPermissions(role: UserRole, permissions: string[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

// Pobierz wszystkie uprawnienia dla roli
export function getPermissionsForRole(role: UserRole): string[] {
  return rolePermissions[role] || [];
}

// Sprawdź czy użytkownik może zarządzać innym użytkownikiem
export function canManageUser(managerRole: UserRole, _targetRole: UserRole): boolean {
  void _targetRole;
  // Tylko admin może zarządzać użytkownikami
  if (managerRole !== "ADMIN") return false;

  // Admin może zarządzać wszystkimi
  return true;
}

// Sprawdź czy użytkownik może edytować dane innego użytkownika
export function canEditUserData(
  editorRole: UserRole,
  editorId: string,
  targetId: string
): boolean {
  // Admin może edytować wszystko
  if (editorRole === "ADMIN") return true;

  // USER może edytować tylko swoje dane
  if (editorRole === "USER") return editorId === targetId;

  // CHILD może edytować tylko swoje dane (ograniczone)
  if (editorRole === "CHILD") return editorId === targetId;

  return false;
}

// Etykiety ról w języku polskim
export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrator",
  USER: "Użytkownik",
  CHILD: "Dziecko",
};

// Opisy ról
export const roleDescriptions: Record<UserRole, string> = {
  ADMIN: "Pełna kontrola nad gospodarstwem domowym. Może zarządzać użytkownikami, ustawieniami i wszystkimi danymi.",
  USER: "Standardowy dostęp do wszystkich funkcji. Może zarządzać swoimi danymi i współdzielonymi zasobami.",
  CHILD: "Ograniczony dostęp. Może przeglądać kalendarz, oznaczać zadania jako wykonane i przeglądać posiłki.",
};

// Kolory ról
export const roleColors: Record<UserRole, string> = {
  ADMIN: "bg-red-100 text-red-800 border-red-300",
  USER: "bg-blue-100 text-blue-800 border-blue-300",
  CHILD: "bg-green-100 text-green-800 border-green-300",
};

