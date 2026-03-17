import jsPDF from "jspdf";

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface RecipeStep {
  order: number;
  instruction: string;
  timeMinutes?: number | null;
}

interface RecipeForPDF {
  name: string;
  description?: string | null;
  category?: string | null;
  cuisine?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  servings: number;
  difficulty: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips?: string | null;
  tags?: string[];
  // Wartości odżywcze
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
}

const DIFFICULTY_PL: Record<string, string> = {
  EASY: "Łatwy",
  MEDIUM: "Średni",
  HARD: "Trudny",
};

const CATEGORY_PL: Record<string, string> = {
  BREAKFAST: "Śniadanie",
  LUNCH: "Obiad",
  DINNER: "Kolacja",
  SNACK: "Przekąska",
  DESSERT: "Deser",
  DRINK: "Napój",
  OTHER: "Inne",
};

export function exportRecipeToPDF(recipe: RecipeForPDF): void {
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 7;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const maxWidth = pageWidth - 2 * margin;

  // Nagłówek
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(recipe.name, margin, yPos);
  yPos += 10;

  // Linia oddzielająca
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Opis
  if (recipe.description) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(recipe.description, maxWidth);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * lineHeight + 5;
  }

  // Informacje podstawowe
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  const info: string[] = [];
  if (recipe.category) info.push(`Kategoria: ${CATEGORY_PL[recipe.category] || recipe.category}`);
  if (recipe.cuisine) info.push(`Kuchnia: ${recipe.cuisine}`);
  info.push(`Trudność: ${DIFFICULTY_PL[recipe.difficulty]}`);
  info.push(`Porcje: ${recipe.servings}`);

  if (recipe.prepTime) info.push(`Przygotowanie: ${recipe.prepTime} min`);
  if (recipe.cookTime) info.push(`Gotowanie: ${recipe.cookTime} min`);
  if (recipe.totalTime) info.push(`Całkowity czas: ${recipe.totalTime} min`);

  doc.setFont("helvetica", "normal");
  info.forEach((line) => {
    doc.text(line, margin, yPos);
    yPos += lineHeight;
  });
  yPos += 5;

  // Wartości odżywcze (jeśli dostępne)
  if (recipe.calories || recipe.protein || recipe.carbs || recipe.fat) {
    doc.setFont("helvetica", "bold");
    doc.text("Wartości odżywcze (na porcję):", margin, yPos);
    yPos += lineHeight;

    doc.setFont("helvetica", "normal");
    if (recipe.calories) {
      doc.text(`• Kalorie: ${recipe.calories} kcal`, margin + 5, yPos);
      yPos += lineHeight;
    }
    if (recipe.protein) {
      doc.text(`• Białko: ${recipe.protein}g`, margin + 5, yPos);
      yPos += lineHeight;
    }
    if (recipe.carbs) {
      doc.text(`• Węglowodany: ${recipe.carbs}g`, margin + 5, yPos);
      yPos += lineHeight;
    }
    if (recipe.fat) {
      doc.text(`• Tłuszcze: ${recipe.fat}g`, margin + 5, yPos);
      yPos += lineHeight;
    }
    if (recipe.fiber) {
      doc.text(`• Błonnik: ${recipe.fiber}g`, margin + 5, yPos);
      yPos += lineHeight;
    }
    yPos += 5;
  }

  // Sprawdź czy potrzebna nowa strona
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Składniki
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Składniki:", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  recipe.ingredients.forEach((ing) => {
    const line = `• ${ing.quantity} ${ing.unit} - ${ing.name}`;
    doc.text(line, margin + 5, yPos);
    yPos += lineHeight;

    // Nowa strona jeśli trzeba
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
  });
  yPos += 10;

  // Sprawdź czy potrzebna nowa strona przed krokami
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  // Kroki przygotowania
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Przygotowanie:", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  recipe.steps.forEach((step) => {
    // Numer kroku
    doc.setFont("helvetica", "bold");
    const stepHeader = `Krok ${step.order}${step.timeMinutes ? ` (${step.timeMinutes} min)` : ""}:`;
    doc.text(stepHeader, margin, yPos);
    yPos += lineHeight;

    // Instrukcja
    doc.setFont("helvetica", "normal");
    const instructionLines = doc.splitTextToSize(step.instruction, maxWidth - 10);
    doc.text(instructionLines, margin + 5, yPos);
    yPos += instructionLines.length * lineHeight + 5;

    // Nowa strona jeśli trzeba
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
  });

  // Wskazówki
  if (recipe.tips) {
    yPos += 5;

    // Nowa strona jeśli trzeba
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Wskazówki:", margin, yPos);
    yPos += lineHeight;

    doc.setFont("helvetica", "normal");
    const tipsLines = doc.splitTextToSize(recipe.tips, maxWidth);
    doc.text(tipsLines, margin + 5, yPos);
    yPos += tipsLines.length * lineHeight;
  }

  // Tagi
  if (recipe.tags && recipe.tags.length > 0) {
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Tagi: ${recipe.tags.join(", ")}`, margin, yPos);
  }

  // Stopka
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Strona ${i} z ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
    doc.text(
      `Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`,
      pageWidth - margin,
      doc.internal.pageSize.height - 10,
      { align: "right" }
    );
  }

  // Zapisz PDF
  const fileName = `${recipe.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
  doc.save(fileName);
}

