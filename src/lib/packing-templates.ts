import type { TripChecklistCategory } from "@prisma/client";

export interface PackingTemplate {
  id: string;
  name: string;
  description: string;
  items: Array<{
    name: string;
    category: TripChecklistCategory;
  }>;
}

export const packingTemplates: PackingTemplate[] = [
  {
    id: "beach",
    name: "Plaża",
    description: "Podstawowe rzeczy na wyjazd nad morze",
    items: [
      { name: "Strój kąpielowy", category: "CLOTHES" },
      { name: "Ręcznik plażowy", category: "CLOTHES" },
      { name: "Klapki", category: "CLOTHES" },
      { name: "Okulary przeciwsłoneczne", category: "OTHER" },
      { name: "Krem z filtrem SPF 50", category: "TOILETRIES" },
      { name: "Balsam po opalaniu", category: "TOILETRIES" },
      { name: "Czapka/kapelusz", category: "CLOTHES" },
      { name: "Lekkie ubrania", category: "CLOTHES" },
      { name: "Paszport", category: "DOCUMENTS" },
      { name: "Bilety", category: "DOCUMENTS" },
      { name: "Ubezpieczenie podróżne", category: "DOCUMENTS" },
    ],
  },
  {
    id: "mountain",
    name: "Góry",
    description: "Sprzęt na wycieczkę w góry",
    items: [
      { name: "Buty trekkingowe", category: "CLOTHES" },
      { name: "Kurtka przeciwdeszczowa", category: "CLOTHES" },
      { name: "Polar/bluza", category: "CLOTHES" },
      { name: "Plecak turystyczny", category: "OTHER" },
      { name: "Mapa/kompas", category: "OTHER" },
      { name: "Latarka", category: "ELECTRONICS" },
      { name: "Powerbank", category: "ELECTRONICS" },
      { name: "Apteczka", category: "MEDICINE" },
      { name: "Środek na owady", category: "MEDICINE" },
      { name: "Czapka", category: "CLOTHES" },
      { name: "Rękawiczki", category: "CLOTHES" },
    ],
  },
  {
    id: "city",
    name: "Miasto",
    description: "Essentials na city break",
    items: [
      { name: "Wygodne buty", category: "CLOTHES" },
      { name: "Plecak miejski", category: "OTHER" },
      { name: "Przewodnik/mapa", category: "OTHER" },
      { name: "Powerbank", category: "ELECTRONICS" },
      { name: "Ładowarka", category: "ELECTRONICS" },
      { name: "Adapter", category: "ELECTRONICS" },
      { name: "Paszport/dowód", category: "DOCUMENTS" },
      { name: "Bilety", category: "DOCUMENTS" },
      { name: "Parasol", category: "OTHER" },
      { name: "Kosmetyczka", category: "TOILETRIES" },
    ],
  },
  {
    id: "winter",
    name: "Zima",
    description: "Ciepłe ubrania na zimowy wyjazd",
    items: [
      { name: "Ciepła kurtka", category: "CLOTHES" },
      { name: "Czapka zimowa", category: "CLOTHES" },
      { name: "Rękawiczki", category: "CLOTHES" },
      { name: "Szalik", category: "CLOTHES" },
      { name: "Ciepłe buty", category: "CLOTHES" },
      { name: "Termoaktywna bielizna", category: "CLOTHES" },
      { name: "Skarpety wełniane", category: "CLOTHES" },
      { name: "Krem ochronny na twarz", category: "TOILETRIES" },
      { name: "Balsam do ust", category: "TOILETRIES" },
    ],
  },
  {
    id: "electronics",
    name: "Elektronika",
    description: "Wszystkie urządzenia i akcesoria",
    items: [
      { name: "Telefon", category: "ELECTRONICS" },
      { name: "Ładowarka do telefonu", category: "ELECTRONICS" },
      { name: "Laptop", category: "ELECTRONICS" },
      { name: "Ładowarka do laptopa", category: "ELECTRONICS" },
      { name: "Powerbank", category: "ELECTRONICS" },
      { name: "Słuchawki", category: "ELECTRONICS" },
      { name: "Adapter podróżny", category: "ELECTRONICS" },
      { name: "Kabel USB", category: "ELECTRONICS" },
      { name: "Czytnik e-booków", category: "ELECTRONICS" },
    ],
  },
  {
    id: "documents",
    name: "Dokumenty",
    description: "Wszystkie potrzebne dokumenty",
    items: [
      { name: "Paszport", category: "DOCUMENTS" },
      { name: "Dowód osobisty", category: "DOCUMENTS" },
      { name: "Prawo jazdy", category: "DOCUMENTS" },
      { name: "Bilety lotnicze", category: "DOCUMENTS" },
      { name: "Potwierdzenie rezerwacji hotelu", category: "DOCUMENTS" },
      { name: "Ubezpieczenie podróżne", category: "DOCUMENTS" },
      { name: "Karta pokładowa", category: "DOCUMENTS" },
      { name: "Wiza (jeśli potrzebna)", category: "DOCUMENTS" },
      { name: "Certyfikat szczepień", category: "DOCUMENTS" },
    ],
  },
  {
    id: "toiletries",
    name: "Kosmetyki",
    description: "Podstawowe kosmetyki i higiena",
    items: [
      { name: "Pasta do zębów", category: "TOILETRIES" },
      { name: "Szczoteczka do zębów", category: "TOILETRIES" },
      { name: "Szampon", category: "TOILETRIES" },
      { name: "Żel pod prysznic", category: "TOILETRIES" },
      { name: "Dezodorant", category: "TOILETRIES" },
      { name: "Krem do twarzy", category: "TOILETRIES" },
      { name: "Kosmetyczka", category: "TOILETRIES" },
      { name: "Maszynka do golenia", category: "TOILETRIES" },
      { name: "Szczotka/grzebień", category: "TOILETRIES" },
    ],
  },
  {
    id: "medicine",
    name: "Apteczka",
    description: "Podstawowe leki i środki medyczne",
    items: [
      { name: "Leki na ból głowy", category: "MEDICINE" },
      { name: "Leki na ból brzucha", category: "MEDICINE" },
      { name: "Plastry", category: "MEDICINE" },
      { name: "Bandaż", category: "MEDICINE" },
      { name: "Środek na oparzenia", category: "MEDICINE" },
      { name: "Termometr", category: "MEDICINE" },
      { name: "Leki na przeziębienie", category: "MEDICINE" },
      { name: "Tabletki na chorobę lokomocyjną", category: "MEDICINE" },
      { name: "Recepturowe leki", category: "MEDICINE" },
    ],
  },
];

// Smart suggestions based on destination and dates
export function getSmartSuggestions(
  destination: string,
  startDate: Date,
  endDate: Date
): string[] {
  const suggestions: string[] = [];
  const month = startDate.getMonth(); // 0-11
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Sezonowe sugestie
  if (month >= 5 && month <= 8) {
    // Lato
    suggestions.push("☀️ Lato: Zabierz krem z filtrem i okulary przeciwsłoneczne");
  } else if (month >= 11 || month <= 2) {
    // Zima
    suggestions.push("❄️ Zima: Nie zapomnij ciepłej kurtki i czapki");
  }

  // Długość wyjazdu
  if (durationDays > 7) {
    suggestions.push("📅 Długi wyjazd: Rozważ zabranie dodatkowych ubrań");
  }

  // Destynacja
  const destLower = destination.toLowerCase();
  if (destLower.includes("wielka brytania") || destLower.includes("uk") || destLower.includes("anglia")) {
    suggestions.push("🔌 Wielka Brytania: Zabierz adapter typu G");
  }
  if (destLower.includes("włochy") || destLower.includes("italy")) {
    suggestions.push("🔌 Włochy: Zabierz adapter typu L");
  }
  if (destLower.includes("plaża") || destLower.includes("morze")) {
    suggestions.push("🏖️ Plaża: Strój kąpielowy i ręcznik!");
  }
  if (destLower.includes("góry") || destLower.includes("mountains")) {
    suggestions.push("⛰️ Góry: Buty trekkingowe i kurtka przeciwdeszczowa");
  }

  return suggestions;
}
