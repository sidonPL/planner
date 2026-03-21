import assert from "node:assert/strict";
import { findIngredientCaseInsensitiveMatch } from "../src/lib/ingredient-dedup";

function run() {
  const existing = [
    { id: "1", name: "Papryka" },
    { id: "2", name: "Cebula" },
  ];

  const matchLower = findIngredientCaseInsensitiveMatch(existing, "papryka");
  assert.equal(matchLower?.id, "1", "'papryka' powinna znalezc 'Papryka'");

  const matchUpper = findIngredientCaseInsensitiveMatch(existing, "PAPRYKA");
  assert.equal(matchUpper?.id, "1", "'PAPRYKA' powinna znalezc 'Papryka'");

  const noMatch = findIngredientCaseInsensitiveMatch(existing, "Marchew");
  assert.equal(noMatch, undefined, "Nie powinno byc dopasowania dla obcej nazwy");

  console.log("OK: deduplikacja case-insensitive skladnikow dziala.");
}

run();

