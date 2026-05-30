import { prisma } from "@/lib/prisma";
import { sendSSEToUsers } from "@/lib/sse-hub";

export interface PresenceChangePayload {
  id: string;
  userId: string;
  userName: string;
  status: string;
  timestamp: string;
}

export async function broadcastPresenceChange(
  householdId: string,
  payload: PresenceChangePayload
) {
  const members = await prisma.user.findMany({
    where: { householdId },
    select: { id: true },
  });

  return sendSSEToUsers(
    members.map((member) => member.id),
    "presence_change",
    payload
  );
}

export function getPresenceChangeMessage(userName: string, status: string): string {
  switch (status) {
    case "HOME":
      return `${userName} jest w domu`;
    case "WORK":
      return `${userName} jest w pracy`;
    case "SCHOOL":
      return `${userName} jest w szkole`;
    case "VACATION":
      return `${userName} jest na urlopie`;
    case "AWAY":
    default:
      return `${userName} jest poza domem`;
  }
}

export function getPresenceStatusInfo(status: string) {
  switch (status) {
    case "HOME":
      return { label: "W domu", shortLabel: "W domu", color: "bg-green-500", dotColor: "bg-green-500" };
    case "WORK":
      return { label: "W pracy", shortLabel: "W pracy", color: "bg-blue-500", dotColor: "bg-blue-500" };
    case "SCHOOL":
      return { label: "W szkole", shortLabel: "W szkole", color: "bg-orange-500", dotColor: "bg-orange-500" };
    case "VACATION":
      return { label: "Na urlopie", shortLabel: "Na urlopie", color: "bg-purple-500", dotColor: "bg-purple-500" };
    case "AWAY":
      return { label: "Poza domem", shortLabel: "Poza domem", color: "bg-gray-400", dotColor: "bg-gray-400" };
    default:
      return { label: "Nieznany", shortLabel: "Nieznany", color: "bg-gray-400", dotColor: "bg-gray-400" };
  }
}

export const manualPresenceStatuses = [
  { value: "HOME", label: "W domu" },
  { value: "AWAY", label: "Poza domem" },
  { value: "WORK", label: "W pracy" },
  { value: "SCHOOL", label: "W szkole" },
  { value: "VACATION", label: "Na urlopie" },
] as const;
