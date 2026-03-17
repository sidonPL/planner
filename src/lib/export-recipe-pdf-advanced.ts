import jsPDF from "jspdf";
import QRCode from "qrcode";
import autoTable from 'jspdf-autotable';

// Extend jsPDF type
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface RecipeStep {
  order: number;
  instruction: string;
  timeMinutes?: number | null;
  temperature?: number | null;
  tip?: string | null;
  image?: string | null;
}

interface RecipeForPDF {
  id?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  cuisine?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  restTime?: number | null;
  totalTime?: number | null;
  servings: number;
  difficulty: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips?: string | null;
  tags?: string[];
  imageUrl?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  ovenTemp?: number | null;
  ovenMode?: string | null;
  cookingMethod?: string | null;
}

interface ExportOptions {
  servingsMultiplier?: number;
  includeQR?: boolean;
  includeImage?: boolean;
  cardFormat?: boolean;
  accentColor?: [number, number, number];
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

const COOKING_METHOD_PL: Record<string, string> = {
  BAKING: "Pieczenie",
  FRYING: "Smażenie",
  BOILING: "Gotowanie",
  STEAMING: "Na parze",
  GRILLING: "Grillowanie",
  ROASTING: "Pieczenie (mięso)",
  STEWING: "Duszenie",
  SAUTEING: "Podsmażanie",
  AIR_FRYING: "Air fryer",
  MIXING: "Mieszanie",
  OTHER: "Inne",
};

const OVEN_MODE_PL: Record<string, string> = {
  CONVENTIONAL: "Góra-dół",
  FAN_ASSISTED: "Termoobieg",
  GRILL: "Grill",
  PIZZA: "Tryb pizza",
};

export async function exportRecipeToPDF(
  recipe: RecipeForPDF,
  options: ExportOptions = {}
): Promise<void> {
  const {
    servingsMultiplier = 1,
    includeQR = true,
    includeImage = true,
    cardFormat = false,
    accentColor = [220, 38, 38],
  } = options;

  const doc = cardFormat
    ? new jsPDF({
        format: [100, 150],
        compress: true,
        putOnlyUsedFonts: true
      })
    : new jsPDF({
        compress: true,
        putOnlyUsedFonts: true
      });

  let yPos = 20;
  const lineHeight = cardFormat ? 5 : 7;
  const margin = cardFormat ? 10 : 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxWidth = pageWidth - 2 * margin;
  const fontFamily = "helvetica";

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
    }
  };

  // 1. ZDJĘCIE PRZEPISU
  if (includeImage && recipe.imageUrl && !cardFormat) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = recipe.imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(reject, 5000);
      });

      const imgWidth = maxWidth;
      const imgHeight = (img.height / img.width) * imgWidth;
      doc.addImage(img, "JPEG", margin, yPos, imgWidth, Math.min(imgHeight, 80));
      yPos += Math.min(imgHeight, 80) + 10;
    } catch (error) {
      console.warn("Nie mozna zaladowac zdjecia przepisu:", error);
    }
  }

  // 2. NAGŁÓWEK Z QR KODEM
  doc.setFontSize(cardFormat ? 18 : 28);
  doc.setFont(fontFamily, "bold");
  doc.setTextColor(...accentColor);

  const titleWidth = includeQR && recipe.id && !cardFormat ? maxWidth - 35 : maxWidth;
  const titleLines = doc.splitTextToSize(recipe.name, titleWidth);
  doc.text(titleLines, margin, yPos);
  yPos += titleLines.length * (cardFormat ? 8 : 12) + 5;

  // QR KOD
  if (includeQR && recipe.id && !cardFormat) {
    try {
      const qrUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/recipes/${recipe.id}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 80, margin: 1 });
      doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 30, 20, 30, 30);
    } catch (error) {
      console.warn("Nie mozna wygenerowac QR kodu:", error);
    }
  }

  // LINIA ODDZIELAJĄCA
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;
  doc.setTextColor(0, 0, 0);

  // 3. OPIS
  if (recipe.description && !cardFormat) {
    doc.setFontSize(11);
    doc.setFont(fontFamily, "normal");
    const descLines = doc.splitTextToSize(recipe.description, maxWidth);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * lineHeight + 10;
  }

  // 4. INFORMACJE PODSTAWOWE
  const scaledServings = Math.round(recipe.servings * servingsMultiplier);

  checkPageBreak(40);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, maxWidth, cardFormat ? 28 : 38, 3, 3, 'F');

  yPos += cardFormat ? 7 : 10;
  doc.setFontSize(cardFormat ? 9 : 11);
  doc.setFont(fontFamily, "bold");

  const infoItems: string[] = [];
  if (recipe.category) infoItems.push(`Kategoria: ${CATEGORY_PL[recipe.category] || recipe.category}`);
  if (recipe.cuisine) infoItems.push(`Kuchnia: ${recipe.cuisine}`);
  if (recipe.difficulty) infoItems.push(`Trudność: ${DIFFICULTY_PL[recipe.difficulty]}`);
  infoItems.push(`Porcje: ${scaledServings}`);

  if (recipe.prepTime) infoItems.push(`Przygotowanie: ${recipe.prepTime} min`);
  if (recipe.cookTime) infoItems.push(`Gotowanie: ${recipe.cookTime} min`);
  if (recipe.restTime && !cardFormat) infoItems.push(`Odpoczynek: ${recipe.restTime} min`);
  if (recipe.totalTime && !cardFormat) infoItems.push(`Całkowity czas: ${recipe.totalTime} min`);

  const itemsPerRow = cardFormat ? 2 : 3;
  const colWidth = maxWidth / itemsPerRow;

  infoItems.forEach((item, idx) => {
    const col = idx % itemsPerRow;
    const row = Math.floor(idx / itemsPerRow);
    doc.text(item, margin + 5 + (col * colWidth), yPos + (row * (lineHeight + 1)));
  });

  yPos += Math.ceil(infoItems.length / itemsPerRow) * (lineHeight + 1) + 12;

  // 5. METODA GOTOWANIA I PIEKARNIK
  if ((recipe.cookingMethod || recipe.ovenTemp || recipe.ovenMode) && !cardFormat) {
    checkPageBreak(35);

    doc.setFillColor(255, 245, 230);
    doc.roundedRect(margin, yPos, maxWidth, 25, 3, 3, 'F');

    yPos += 8;
    doc.setFontSize(12);
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(...accentColor);
    doc.text("Metoda gotowania:", margin + 5, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(fontFamily, "normal");
    const cookingInfo: string[] = [];
    if (recipe.cookingMethod) cookingInfo.push(COOKING_METHOD_PL[recipe.cookingMethod] || recipe.cookingMethod);
    if (recipe.ovenTemp) cookingInfo.push(`Temperatura: ${recipe.ovenTemp} C`);
    if (recipe.ovenMode) cookingInfo.push(`Tryb: ${OVEN_MODE_PL[recipe.ovenMode] || recipe.ovenMode}`);

    doc.text(cookingInfo.join(" | "), margin + 5, yPos);
    yPos += 15;
  }

  // 6. WARTOŚCI ODŻYWCZE
  if ((recipe.calories || recipe.protein || recipe.carbs || recipe.fat || recipe.fiber) && !cardFormat) {
    checkPageBreak(50);

    doc.setFontSize(14);
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(...accentColor);
    doc.text("Wartości odżywcze (na porcję):", margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont(fontFamily, "normal");

    const nutritionItems: string[] = [];
    if (recipe.calories) nutritionItems.push(`Kalorie: ${Math.round(recipe.calories / recipe.servings)} kcal`);
    if (recipe.protein) nutritionItems.push(`Białko: ${Math.round(recipe.protein / recipe.servings * 10) / 10}g`);
    if (recipe.carbs) nutritionItems.push(`Węglowodany: ${Math.round(recipe.carbs / recipe.servings * 10) / 10}g`);
    if (recipe.fat) nutritionItems.push(`Tłuszcze: ${Math.round(recipe.fat / recipe.servings * 10) / 10}g`);
    if (recipe.fiber) nutritionItems.push(`Błonnik: ${Math.round(recipe.fiber / recipe.servings * 10) / 10}g`);

    nutritionItems.forEach((item) => {
      doc.text(item, margin + 5, yPos);
      yPos += lineHeight;
    });
    yPos += 10;
  }

  // 7. SKŁADNIKI
  checkPageBreak(35);
  doc.setFontSize(cardFormat ? 14 : 16);
  doc.setFont(fontFamily, "bold");
  doc.setTextColor(...accentColor);
  doc.text("Składniki:", margin, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += cardFormat ? 8 : 12;

  doc.setFontSize(cardFormat ? 9 : 11);
  doc.setFont(fontFamily, "normal");

  recipe.ingredients.forEach((ing) => {
    const scaledQty = Math.round(ing.quantity * servingsMultiplier * 100) / 100;
    const qtyStr = scaledQty % 1 === 0 ? scaledQty.toString() : scaledQty.toFixed(1);
    const line = `  ${qtyStr} ${ing.unit} - ${ing.name}`;

    checkPageBreak(lineHeight + 3);
    doc.text(line, margin + 2, yPos);
    yPos += lineHeight + 1;
  });
  yPos += 12;

  // 8. PRZYGOTOWANIE
  checkPageBreak(35);
  doc.setFontSize(cardFormat ? 14 : 16);
  doc.setFont(fontFamily, "bold");
  doc.setTextColor(...accentColor);
  doc.text("Przygotowanie:", margin, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += cardFormat ? 8 : 12;

  doc.setFontSize(cardFormat ? 9 : 11);

  recipe.steps.forEach((step) => {
    checkPageBreak(40);

    // Numer kroku
    doc.setFillColor(...accentColor);
    doc.circle(margin + 4, yPos - 1, 3.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.text(step.order.toString(), margin + 4, yPos + 1, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(cardFormat ? 9 : 11);

    // Czas i temperatura
    let stepHeader = "";
    if (step.timeMinutes) stepHeader += `${step.timeMinutes} min`;
    if (step.temperature) {
      if (stepHeader) stepHeader += " | ";
      stepHeader += `${step.temperature} C`;
    }

    if (stepHeader) {
      doc.setFont(fontFamily, "bold");
      doc.text(`(${stepHeader})`, margin + 10, yPos + 1);
    }

    yPos += 8;

    // Instrukcja
    doc.setFont(fontFamily, "normal");
    const instructionLines = doc.splitTextToSize(step.instruction, maxWidth - 12);
    instructionLines.forEach((line: string) => {
      checkPageBreak(lineHeight + 2);
      doc.text(line, margin + 10, yPos);
      yPos += lineHeight;
    });

    // Wskazówka dla kroku
    if (step.tip && !cardFormat) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont(fontFamily, "italic");
      const tipLines = doc.splitTextToSize(`Wskazówka: ${step.tip}`, maxWidth - 12);
      tipLines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        doc.text(line, margin + 10, yPos);
        yPos += lineHeight - 1;
      });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(cardFormat ? 9 : 11);
    }

    yPos += 10;
  });

  // 9. WSKAZÓWKI OGÓLNE
  if (recipe.tips && !cardFormat) {
    yPos += 5;
    checkPageBreak(30);

    doc.setFillColor(255, 250, 205);
    const tipsLines = doc.splitTextToSize(recipe.tips, maxWidth - 10);
    const tipsHeight = tipsLines.length * lineHeight + 15;

    checkPageBreak(tipsHeight);
    doc.roundedRect(margin, yPos - 5, maxWidth, tipsHeight, 3, 3, 'F');

    doc.setFontSize(12);
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(...accentColor);
    doc.text("Wskazówki:", margin + 5, yPos + 2);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont(fontFamily, "normal");
    tipsLines.forEach((line: string) => {
      checkPageBreak(lineHeight + 2);
      doc.text(line, margin + 5, yPos);
      yPos += lineHeight;
    });

    yPos += 10;
  }

  // 10. TAGI
  if (recipe.tags && recipe.tags.length > 0 && !cardFormat) {
    yPos += 5;
    checkPageBreak(12);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const tagsText = recipe.tags.map(t => t).join(" | ");
    doc.text(`Tagi: ${tagsText}`, margin, yPos);
    doc.setTextColor(0, 0, 0);
  }

  // 11. STOPKA
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont(fontFamily, "normal");
  doc.setTextColor(150, 150, 150);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Strona ${i} z ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(
      `Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: "right" }
    );
  }

  // 12. ZAPISZ
  const fileName = `${recipe.name.replace(/[^a-z0-9\s]/gi, "_").toLowerCase()}${servingsMultiplier !== 1 ? `_${scaledServings}porcji` : ""}.pdf`;
  doc.save(fileName);
}

// EXPORT WIELU PRZEPISÓW
export async function exportMultipleRecipesToPDF(
  recipes: RecipeForPDF[],
  bookTitle: string = "Moja Ksiazka Kucharska",
  options: ExportOptions = {}
): Promise<void> {
  const {
    accentColor = [220, 38, 38],
  } = options;

  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const fontFamily = "helvetica";

  // STRONA TYTUŁOWA
  doc.setFontSize(32);
  doc.setFont(fontFamily, "bold");
  doc.setTextColor(...accentColor);
  doc.text(bookTitle, pageWidth / 2, 80, { align: "center" });

  doc.setFontSize(14);
  doc.setFont(fontFamily, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${recipes.length} przepisów`, pageWidth / 2, 100, { align: "center" });
  doc.text(`Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`, pageWidth / 2, 110, { align: "center" });

  // SPIS TREŚCI
  doc.addPage();
  doc.setFontSize(20);
  doc.setFont(fontFamily, "bold");
  doc.setTextColor(...accentColor);
  doc.text("Spis treści", margin, 30);

  doc.setFontSize(11);
  doc.setFont(fontFamily, "normal");
  doc.setTextColor(0, 0, 0);

  let yPos = 45;
  const lineHeight = 8;

  recipes.forEach((recipe, index) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 30;
    }

    doc.text(`${index + 1}. ${recipe.name}`, margin + 5, yPos);
    doc.text(`str. ${3 + index * 2}`, pageWidth - margin - 15, yPos, { align: "right" });
    yPos += lineHeight;
  });

  // PRZEPISY
  for (const recipe of recipes) {
    doc.addPage();
    let recipeYPos = margin;

    // Nagłówek
    doc.setFontSize(22);
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(...accentColor);
    const titleLines = doc.splitTextToSize(recipe.name, pageWidth - 2 * margin);
    doc.text(titleLines, margin, recipeYPos);
    recipeYPos += titleLines.length * 10 + 5;

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.8);
    doc.line(margin, recipeYPos, pageWidth - margin, recipeYPos);
    recipeYPos += 10;

    // Informacje
    doc.setFontSize(10);
    doc.setFont(fontFamily, "normal");
    const info: string[] = [];
    if (recipe.category) info.push(`Kategoria: ${CATEGORY_PL[recipe.category] || recipe.category}`);
    if (recipe.difficulty) info.push(`Trudność: ${DIFFICULTY_PL[recipe.difficulty]}`);
    info.push(`Porcje: ${recipe.servings}`);
    if (recipe.prepTime) info.push(`Przygotowanie: ${recipe.prepTime} min`);
    if (recipe.cookTime) info.push(`Gotowanie: ${recipe.cookTime} min`);

    doc.text(info.join(" | "), margin, recipeYPos);
    recipeYPos += 12;

    // Składniki
    doc.setFontSize(14);
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(...accentColor);
    doc.text("Składniki:", margin, recipeYPos);
    doc.setTextColor(0, 0, 0);
    recipeYPos += 8;

    doc.setFontSize(10);
    doc.setFont(fontFamily, "normal");
    recipe.ingredients.forEach((ing) => {
      if (recipeYPos > pageHeight - 30) {
        doc.addPage();
        recipeYPos = margin;
      }
      doc.text(`  ${ing.quantity} ${ing.unit} - ${ing.name}`, margin + 2, recipeYPos);
      recipeYPos += 6;
    });

    recipeYPos += 8;

    // Kroki
    doc.setFontSize(14);
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(...accentColor);
    doc.text("Przygotowanie:", margin, recipeYPos);
    doc.setTextColor(0, 0, 0);
    recipeYPos += 8;

    doc.setFontSize(10);
    recipe.steps.forEach((step) => {
      if (recipeYPos > pageHeight - 40) {
        doc.addPage();
        recipeYPos = margin;
      }

      doc.setFont(fontFamily, "bold");
      doc.text(`Krok ${step.order}:`, margin, recipeYPos);
      recipeYPos += 6;

      doc.setFont(fontFamily, "normal");
      const instructionLines = doc.splitTextToSize(step.instruction, pageWidth - 2 * margin - 10);
      instructionLines.forEach((line: string) => {
        if (recipeYPos > pageHeight - 25) {
          doc.addPage();
          recipeYPos = margin;
        }
        doc.text(line, margin + 5, recipeYPos);
        recipeYPos += 6;
      });
      recipeYPos += 4;
    });
  }

  // Stopka
  const totalPages = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(
      `${bookTitle} - Strona ${i}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  const fileName = bookTitle.replace(/[^a-z0-9\s]/gi, "_").toLowerCase();
  doc.save(`${fileName}.pdf`);
}

