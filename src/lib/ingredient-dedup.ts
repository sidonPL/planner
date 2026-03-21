import { normalizeIngredientName } from "@/lib/name-normalization";

export interface IngredientCandidate {
  id: string;
  name: string;
}

export function findIngredientCaseInsensitiveMatch<T extends IngredientCandidate>(
  candidates: T[],
  name: string
): T | undefined {
  const normalizedTarget = normalizeIngredientName(name);
  return candidates.find(
    (ingredient) => normalizeIngredientName(ingredient.name) === normalizedTarget
  );
}

