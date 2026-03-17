import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: recipeId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pobierz przepis
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
        steps: {
          orderBy: { order: "asc" },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Utwórz PDF
    const doc = new jsPDF();
    let yPosition = 20;

    // Tytuł
    doc.setFontSize(20);
    doc.text(recipe.name, 20, yPosition);
    yPosition += 10;

    // Autor i data
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Autor: ${recipe.createdBy.name || "Nieznany"}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Data: ${new Date(recipe.createdAt).toLocaleDateString("pl-PL")}`, 20, yPosition);
    yPosition += 10;

    // Opis
    if (recipe.description) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      const splitDescription = doc.splitTextToSize(recipe.description, 170);
      doc.text(splitDescription, 20, yPosition);
      yPosition += splitDescription.length * 5 + 5;
    }

    // Informacje podstawowe
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Informacje", 20, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    const info = [
      `Porcje: ${recipe.servings}`,
      `Trudność: ${recipe.difficulty}`,
      recipe.prepTime ? `Przygotowanie: ${recipe.prepTime} min` : null,
      recipe.cookTime ? `Gotowanie: ${recipe.cookTime} min` : null,
    ].filter(Boolean);

    info.forEach((line) => {
      doc.text(line!, 20, yPosition);
      yPosition += 5;
    });
    yPosition += 5;

    // Wartości odżywcze
    if (recipe.calories || recipe.protein || recipe.carbs || recipe.fat) {
      doc.setFontSize(14);
      doc.text("Wartości odżywcze (na porcję)", 20, yPosition);
      yPosition += 7;

      const nutritionData = [
        ["Kalorie", recipe.calories ? `${recipe.calories} kcal` : "-"],
        ["Białko", recipe.protein ? `${recipe.protein}g` : "-"],
        ["Węglowodany", recipe.carbs ? `${recipe.carbs}g` : "-"],
        ["Tłuszcze", recipe.fat ? `${recipe.fat}g` : "-"],
        ["Błonnik", recipe.fiber ? `${recipe.fiber}g` : "-"],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [["Składnik", "Wartość"]],
        body: nutritionData,
        theme: "grid",
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 20 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Nowa strona jeśli potrzeba
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Składniki
    doc.setFontSize(14);
    doc.text("Składniki", 20, yPosition);
    yPosition += 7;

    const ingredientsData = recipe.ingredients.map((ing) => [
      ing.quantity ? `${ing.quantity} ${ing.unit || ""}` : "",
      ing.name,
    ]);

    autoTable(doc, {
      startY: yPosition,
      body: ingredientsData,
      theme: "plain",
      margin: { left: 20 },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: "bold" },
        1: { cellWidth: 140 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Nowa strona dla kroków
    if (yPosition > 200 || recipe.steps.length > 5) {
      doc.addPage();
      yPosition = 20;
    }

    // Kroki przygotowania
    doc.setFontSize(14);
    doc.text("Kroki przygotowania", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    recipe.steps.forEach((step, index) => {
      // Sprawdź czy potrzeba nowej strony
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      // Numer kroku
      doc.setFontSize(12);
      doc.setTextColor(66, 139, 202);
      doc.text(`Krok ${index + 1}`, 20, yPosition);
      yPosition += 7;

      // Treść kroku
      doc.setFontSize(10);
      doc.setTextColor(0);
      const splitContent = doc.splitTextToSize(step.content, 170);
      doc.text(splitContent, 20, yPosition);
      yPosition += splitContent.length * 5;

      // Czas trwania
      if (step.duration) {
        doc.setTextColor(100);
        doc.text(`⏱ ${step.duration} min`, 20, yPosition);
        yPosition += 5;
      }

      yPosition += 5;
    });

    // Stopka
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Strona ${i} z ${pageCount} | Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`,
        20,
        285
      );
    }

    // Zwróć PDF jako buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${recipe.name.replace(/[^a-z0-9]/gi, "_")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

