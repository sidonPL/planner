"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ShieldAlert, User } from "lucide-react";

interface Allergen {
  name: string;
  affectedUsers: { id: string; name: string }[];
}

interface AllergenAlertProps {
  allergens: string[]; // Alergeny w przepisie
  householdMembers: Array<{ id: string; name: string; allergens: string[] }>;
  className?: string;
}

export function AllergenAlert({ allergens, householdMembers, className }: AllergenAlertProps) {
  if (!allergens || allergens.length === 0) {
    return null;
  }

  // Normalizuj nazwy alergenów
  const normalizedRecipeAllergens = allergens.map((a) => normalizeAllergen(a));

  // Znajdź członków rodziny z alergiami na składniki w przepisie
  const affectedMembers = householdMembers.filter((member) => {
    if (!member.allergens || member.allergens.length === 0) return false;

    return member.allergens.some((userAllergen) => {
      const normalized = normalizeAllergen(userAllergen);
      return normalizedRecipeAllergens.some((recipeAllergen) =>
        recipeAllergen.includes(normalized) || normalized.includes(recipeAllergen)
      );
    });
  });

  // Grupuj alergeny z użytkownikami
  const allergenGroups: Allergen[] = normalizedRecipeAllergens.map((allergen) => {
    const affected = householdMembers.filter((member) =>
      member.allergens?.some((ua) => {
        const norm = normalizeAllergen(ua);
        return allergen.includes(norm) || norm.includes(allergen);
      })
    );

    return {
      name: formatAllergen(allergen),
      affectedUsers: affected.map((m) => ({ id: m.id, name: m.name || "Użytkownik" })),
    };
  });

  const hasAffectedMembers = affectedMembers.length > 0;

  return (
    <div className={className}>
      <Card className={hasAffectedMembers ? "border-red-300 bg-red-50 dark:bg-red-950/20" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5 text-orange-600" />
            Informacje o alergenach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista alergenów w przepisie */}
          <div>
            <p className="text-sm font-medium mb-2">Ten przepis zawiera:</p>
            <div className="flex flex-wrap gap-2">
              {allergenGroups.map((allergen, idx) => (
                <Badge
                  key={idx}
                  variant={allergen.affectedUsers.length > 0 ? "destructive" : "secondary"}
                  className="gap-1"
                >
                  {allergen.name}
                  {allergen.affectedUsers.length > 0 && (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Alerty dla członków rodziny */}
          {hasAffectedMembers && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Uwaga! Ryzyko alergii</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p className="font-medium">
                  Ten przepis może być niebezpieczny dla:
                </p>
                <div className="space-y-1">
                  {affectedMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 text-sm">
                      <User className="h-3 w-3" />
                      <span className="font-medium">{member.name}</span>
                      <span className="text-xs opacity-75">
                        (alergia na: {member.allergens?.map(formatAllergen).join(", ")})
                      </span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Info jeśli brak zagrożeń */}
          {!hasAffectedMembers && householdMembers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              ✓ Brak zagrożeń alergicznych dla członków Twojej rodziny
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Normalizuj nazwę alergenu do porównywania
 */
function normalizeAllergen(allergen: string): string {
  return allergen
    .toLowerCase()
    .trim()
    .replace(/^en:/, "") // Usuń prefix z Open Food Facts
    .replace(/[^a-ząćęłńóśźż\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Formatuj nazwę alergenu do wyświetlania
 */
function formatAllergen(allergen: string): string {
  const translations: Record<string, string> = {
    milk: "Mleko",
    lactose: "Laktoza",
    eggs: "Jajka",
    fish: "Ryby",
    shellfish: "Skorupiaki",
    "tree nuts": "Orzechy",
    nuts: "Orzechy",
    peanuts: "Orzeszki ziemne",
    wheat: "Pszenica",
    gluten: "Gluten",
    soybeans: "Soja",
    soy: "Soja",
    celery: "Seler",
    mustard: "Musztarda",
    sesame: "Sezam",
    "sulphur dioxide": "Dwutlenek siarki",
    sulfites: "Siarczyny",
    lupin: "Łubin",
    molluscs: "Mięczaki",
  };

  const normalized = normalizeAllergen(allergen);

  // Sprawdź tłumaczenia
  for (const [key, value] of Object.entries(translations)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // Kapitalizuj pierwszą literę
  return allergen.charAt(0).toUpperCase() + allergen.slice(1);
}

