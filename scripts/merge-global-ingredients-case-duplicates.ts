import { PrismaClient } from "@prisma/client";
import { normalizeIngredientName } from "../src/lib/name-normalization";

type IngredientRow = {
  id: string;
  householdId: string;
  name: string;
  usageCount: number;
  createdAt: Date;
};

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

function groupKey(item: IngredientRow): string {
  return `${item.householdId}::${normalizeIngredientName(item.name)}`;
}

async function main() {
  const ingredients = await prisma.globalIngredient.findMany({
    select: {
      id: true,
      householdId: true,
      name: true,
      usageCount: true,
      createdAt: true,
    },
    orderBy: [{ householdId: "asc" }, { name: "asc" }],
  });

  const grouped = new Map<string, IngredientRow[]>();
  for (const ingredient of ingredients) {
    const key = groupKey(ingredient);
    const list = grouped.get(key) ?? [];
    list.push(ingredient);
    grouped.set(key, list);
  }

  const duplicateGroups = Array.from(grouped.values()).filter((group) => group.length > 1);

  if (duplicateGroups.length === 0) {
    console.log("Brak duplikatow globalnych skladnikow (case-insensitive).");
    return;
  }

  console.log(`Wykryto ${duplicateGroups.length} grup duplikatow.`);

  for (const group of duplicateGroups) {
    const sorted = [...group].sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const primary = sorted[0];
    const duplicates = sorted.slice(1);
    const usageToAdd = duplicates.reduce((sum, item) => sum + item.usageCount, 0);

    console.log(`\n[${primary.householdId}] ${group.map((g) => g.name).join(" | ")}`);
    console.log(` -> primary: ${primary.name} (${primary.id}), duplicate count: ${duplicates.length}`);

    if (dryRun) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      for (const duplicate of duplicates) {
        await tx.recipeIngredient.updateMany({
          where: { globalIngredientId: duplicate.id },
          data: { globalIngredientId: primary.id },
        });
      }

      if (usageToAdd > 0) {
        await tx.globalIngredient.update({
          where: { id: primary.id },
          data: { usageCount: { increment: usageToAdd } },
        });
      }

      await tx.globalIngredient.deleteMany({
        where: { id: { in: duplicates.map((d) => d.id) } },
      });
    });
  }

  console.log("\nScalanie duplikatow zakonczone.");
}

main()
  .catch((error) => {
    console.error("Blad podczas scalania globalnych skladnikow:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

