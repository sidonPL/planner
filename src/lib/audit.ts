import { prisma } from "./prisma";
import { AuditAction } from "@prisma/client";

interface AuditLogEntry {
  userId?: string;
  householdId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Loguje akcję do audit logu
 */
export async function logAudit(entry: AuditLogEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        householdId: entry.householdId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityName: entry.entityName,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Logowanie audytu nie powinno przerywać głównej operacji
    console.error("[AuditLog] Error logging action:", error);
  }
}

/**
 * Pobierz logi audytu dla gospodarstwa domowego
 */
export async function getHouseholdAuditLogs(
  householdId: string,
  options?: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const where: {
    householdId: string;
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {
    householdId,
  };

  if (options?.userId) {
    where.userId = options.userId;
  }

  if (options?.action) {
    where.action = options.action;
  }

  if (options?.entityType) {
    where.entityType = options.entityType;
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options?.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options?.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Mapowanie akcji na czytelne opisy
 */
export const auditActionLabels: Record<AuditAction, string> = {
  CREATE: "Utworzono",
  UPDATE: "Zaktualizowano",
  DELETE: "Usunięto",
  TASK_COMPLETE: "Ukończono zadanie",
  TASK_ASSIGN: "Przypisano zadanie",
  TASK_UNASSIGN: "Cofnięto przypisanie",
  EVENT_INVITE: "Zaproszono na wydarzenie",
  EVENT_CANCEL: "Anulowano wydarzenie",
  MEMBER_INVITE: "Zaproszono członka",
  MEMBER_REMOVE: "Usunięto członka",
  MEMBER_ROLE_CHANGE: "Zmieniono rolę",
  RECIPE_FAVORITE: "Dodano do ulubionych",
  RECIPE_UNFAVORITE: "Usunięto z ulubionych",
  PRESENCE_CHANGE: "Zmieniono obecność",
  SHOPPING_PURCHASE: "Zakupiono produkty",
  TRIP_PARTICIPANT_ADD: "Dodano uczestnika",
  TRIP_PARTICIPANT_REMOVE: "Usunięto uczestnika",
  BADGE_EARN: "Zdobyto odznakę",
  REWARD_CLAIM: "Odebrano nagrodę",
  LOGIN: "Zalogowano",
  LOGOUT: "Wylogowano",
  SETTINGS_CHANGE: "Zmieniono ustawienia",
};

/**
 * Mapowanie typów encji na czytelne opisy
 */
export const entityTypeLabels: Record<string, string> = {
  Task: "Zadanie",
  Event: "Wydarzenie",
  Recipe: "Przepis",
  Meal: "Posiłek",
  ShoppingItem: "Produkt zakupowy",
  InventoryItem: "Produkt w spiżarni",
  Trip: "Wyjazd",
  Transaction: "Transakcja",
  Budget: "Budżet",
  Schedule: "Harmonogram",
  BoardNote: "Notatka",
  User: "Użytkownik",
  Household: "Gospodarstwo",
  Badge: "Odznaka",
  Reward: "Nagroda",
  Category: "Kategoria",
};

