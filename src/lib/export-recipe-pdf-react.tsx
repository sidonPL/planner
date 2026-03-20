/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import QRCode from "qrcode";

// Stałe
const QR_SIZE = 60;
const QR_GENERATION_SIZE = 120;
const IMAGE_MAX_HEIGHT = 200;
const PAGE_PADDING = 30;
const LOGO_SIZE = 40;
const STEP_NUMBER_SIZE = 20;

// Funkcje pomocnicze
function formatTime(minutes: number | null | undefined): string {
  if (!minutes) return '—';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes}min`;
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-ząćęłńóśźż0-9\s]/gi, '_')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .trim();
}

function validateColor(color: string | undefined): string {
  if (!color) return '#dc2626';
  // Prosta walidacja hex
  if (/^#[0-9A-F]{6}$/i.test(color)) return color;
  return '#dc2626';
}

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
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
  accentColor?: string;
  includeCheckboxes?: boolean;
  logoUrl?: string;
  pageSize?: 'A4' | 'A5' | 'LETTER';
  printMode?: boolean;
  locale?: 'pl' | 'en';
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

// Styles
const createStyles = (accentColor: string, printMode: boolean = false) => StyleSheet.create({
  page: {
    padding: PAGE_PADDING,
    fontFamily: 'Helvetica',
    fontSize: 11,
    backgroundColor: printMode ? '#ffffff' : undefined,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: accentColor,
    marginBottom: 10,
  },
  line: {
    borderBottomWidth: 2,
    borderBottomColor: accentColor,
    marginBottom: 15,
  },
  description: {
    fontSize: 11,
    marginBottom: 15,
    lineHeight: 1.5,
  },
  infoBox: {
    backgroundColor: printMode ? '#ffffff' : '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    ...(printMode ? {
      borderWidth: 1,
      borderColor: '#cccccc',
    } : {}),
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  infoItem: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: accentColor,
    marginTop: 15,
    marginBottom: 10,
  },
  cookingBox: {
    backgroundColor: printMode ? '#ffffff' : '#fff5e6',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    ...(printMode ? {
      borderWidth: 1,
      borderColor: '#cccccc',
    } : {}),
  },
  cookingBoxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: accentColor,
    marginBottom: 5,
  },
  cookingBoxText: {
    fontSize: 10,
  },
  nutritionItem: {
    fontSize: 10,
    marginBottom: 4,
  },
  ingredientItem: {
    fontSize: 10,
    marginBottom: 4,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientCategory: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: accentColor,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 8,
    borderRadius: 2,
  },
  stepContainer: {
    marginBottom: 15,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  stepNumber: {
    width: STEP_NUMBER_SIZE,
    height: STEP_NUMBER_SIZE,
    borderRadius: STEP_NUMBER_SIZE / 2,
    backgroundColor: accentColor,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 1.8,
    marginRight: 10,
  },
  stepTime: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
  },
  stepInstruction: {
    fontSize: 10,
    marginLeft: 30,
    lineHeight: 1.5,
  },
  stepTip: {
    fontSize: 9,
    marginLeft: 30,
    marginTop: 5,
    color: '#666',
    fontStyle: 'italic',
  },
  tipsBox: {
    backgroundColor: printMode ? '#ffffff' : '#fffacd',
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
    ...(printMode ? {
      borderWidth: 1,
      borderColor: '#cccccc',
    } : {}),
  },
  tipsBoxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: accentColor,
    marginBottom: 5,
  },
  tipsBoxText: {
    fontSize: 10,
  },
  tags: {
    fontSize: 9,
    color: '#666',
    marginTop: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
  qrCode: {
    position: 'absolute',
    top: 20,
    right: PAGE_PADDING,
    width: QR_SIZE,
    height: QR_SIZE,
  },
  logo: {
    position: 'absolute',
    top: 20,
    left: PAGE_PADDING,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  mainImage: {
    width: '100%',
    maxHeight: IMAGE_MAX_HEIGHT,
    objectFit: 'cover',
    marginBottom: 15,
    borderRadius: 5,
  },
});

// PDF Document Component
const RecipePDFDocument = ({
  recipe,
  options,
  qrDataUrl
}: {
  recipe: RecipeForPDF;
  options: ExportOptions;
  qrDataUrl?: string;
}) => {
  const accentColor = validateColor(options.accentColor);
  const styles = createStyles(accentColor, options.printMode);
  const servingsMultiplier = options.servingsMultiplier || 1;
  const scaledServings = Math.round((recipe.servings || 1) * servingsMultiplier);
  const pageSize = options.pageSize || 'A4';

  // Grupowanie składników po kategoriach
  const groupedIngredients = recipe.ingredients.reduce((acc, ing) => {
    const category = ing.category || 'Główne składniki';
    if (!acc[category]) acc[category] = [];
    acc[category].push(ing);
    return acc;
  }, {} as Record<string, RecipeIngredient[]>);

  return (
    <Document
      title={recipe.name}
      author="Family Planner"
      subject={`Przepis: ${recipe.name}`}
      keywords={recipe.tags?.join(', ')}
    >
      <Page size={pageSize} style={styles.page}>
        {/* Logo */}
        {options.logoUrl && (
          <Image src={options.logoUrl} style={styles.logo} />
        )}

        {/* QR Code */}
        {options.includeQR && qrDataUrl && (
          <Image src={qrDataUrl} style={styles.qrCode} />
        )}

        {/* Main Image */}
        {options.includeImage && recipe.imageUrl && (
          <Image src={recipe.imageUrl} style={styles.mainImage} />
        )}

        {/* Header */}
        <Text style={styles.header}>{recipe.name}</Text>
        <View style={styles.line} />

        {/* Description */}
        {recipe.description && (
          <Text style={styles.description}>{recipe.description}</Text>
        )}

        {/* Basic Info */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            {recipe.category && (
              <Text style={styles.infoItem}>
                Kategoria: {CATEGORY_PL[recipe.category] || recipe.category}
              </Text>
            )}
            {recipe.cuisine && (
              <Text style={styles.infoItem}>
                Kuchnia: {recipe.cuisine}
              </Text>
            )}
            {recipe.difficulty && (
              <Text style={styles.infoItem}>
                Trudność: {DIFFICULTY_PL[recipe.difficulty]}
              </Text>
            )}
            <Text style={styles.infoItem}>
              Porcje: {scaledServings}
            </Text>
            {recipe.prepTime && (
              <Text style={styles.infoItem}>
                Przygotowanie: {formatTime(recipe.prepTime)}
              </Text>
            )}
            {recipe.cookTime && (
              <Text style={styles.infoItem}>
                Gotowanie: {formatTime(recipe.cookTime)}
              </Text>
            )}
            {recipe.restTime && (
              <Text style={styles.infoItem}>
                Odpoczynek: {formatTime(recipe.restTime)}
              </Text>
            )}
            {recipe.totalTime && (
              <Text style={styles.infoItem}>
                Całkowity czas: {formatTime(recipe.totalTime)}
              </Text>
            )}
          </View>
        </View>

        {/* Cooking Method */}
        {(recipe.cookingMethod || recipe.ovenTemp || recipe.ovenMode) && (
          <View style={styles.cookingBox}>
            <Text style={styles.cookingBoxTitle}>
              Metoda gotowania:
            </Text>
            <Text style={styles.cookingBoxText}>
              {recipe.cookingMethod && (COOKING_METHOD_PL[recipe.cookingMethod] || recipe.cookingMethod)}
              {recipe.ovenTemp && ` | Temperatura: ${recipe.ovenTemp}°C`}
              {recipe.ovenMode && ` | Tryb: ${OVEN_MODE_PL[recipe.ovenMode] || recipe.ovenMode}`}
            </Text>
          </View>
        )}

        {/* Nutrition - Skalowane wartości */}
        {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat || recipe.fiber) && (
          <View>
            <Text style={styles.sectionTitle}>Wartości odżywcze (na porcję):</Text>
            {recipe.calories && (
              <Text style={styles.nutritionItem}>
                Kalorie: {Math.round(recipe.calories / (recipe.servings || 1))} kcal
              </Text>
            )}
            {recipe.protein && (
              <Text style={styles.nutritionItem}>
                Białko: {Math.round(recipe.protein / (recipe.servings || 1) * 10) / 10}g
              </Text>
            )}
            {recipe.carbs && (
              <Text style={styles.nutritionItem}>
                Węglowodany: {Math.round(recipe.carbs / (recipe.servings || 1) * 10) / 10}g
              </Text>
            )}
            {recipe.fat && (
              <Text style={styles.nutritionItem}>
                Tłuszcze: {Math.round(recipe.fat / (recipe.servings || 1) * 10) / 10}g
              </Text>
            )}
            {recipe.fiber && (
              <Text style={styles.nutritionItem}>
                Błonnik: {Math.round(recipe.fiber / (recipe.servings || 1) * 10) / 10}g
              </Text>
            )}
          </View>
        )}

        {/* Ingredients - Zgrupowane */}
        <Text style={styles.sectionTitle}>Składniki:</Text>
        {recipe.ingredients.length === 0 ? (
          <Text style={styles.ingredientItem}>Brak składników</Text>
        ) : (
          Object.entries(groupedIngredients).map(([category, ingredients]) => (
            <View key={category}>
              {Object.keys(groupedIngredients).length > 1 && (
                <Text style={styles.ingredientCategory}>{category}</Text>
              )}
              {ingredients.map((ing, idx) => {
                const scaledQty = Math.round(ing.quantity * servingsMultiplier * 100) / 100;
                const qtyStr = scaledQty % 1 === 0 ? scaledQty.toString() : scaledQty.toFixed(1);
                return (
                  <View key={idx} style={styles.ingredientItem}>
                    {options.includeCheckboxes && <View style={styles.checkbox} />}
                    <Text>• {qtyStr} {ing.unit} - {ing.name}</Text>
                  </View>
                );
              })}
            </View>
          ))
        )}

        {/* Steps */}
        <Text style={styles.sectionTitle}>Przygotowanie:</Text>
        {recipe.steps.length === 0 ? (
          <Text style={styles.stepInstruction}>Brak kroków</Text>
        ) : (
          recipe.steps.map((step) => (
            <View key={step.order} style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>{step.order}</Text>
                {(step.timeMinutes || step.temperature) && (
                  <Text style={styles.stepTime}>
                    {step.timeMinutes && formatTime(step.timeMinutes)}
                    {step.timeMinutes && step.temperature && ' | '}
                    {step.temperature && `${step.temperature}°C`}
                  </Text>
                )}
              </View>
              <Text style={styles.stepInstruction}>{step.instruction}</Text>
              {step.tip && (
                <Text style={styles.stepTip}>💡 Wskazówka: {step.tip}</Text>
              )}
            </View>
          ))
        )}

        {/* Tips */}
        {recipe.tips && (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsBoxTitle}>
              💡 Wskazówki:
            </Text>
            <Text style={styles.tipsBoxText}>{recipe.tips}</Text>
          </View>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <Text style={styles.tags}>
            Tagi: {recipe.tags.join(' | ')}
          </Text>
        )}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Wygenerowano: {new Date().toLocaleDateString('pl-PL')} | Family Planner
        </Text>
      </Page>
    </Document>
  );
};

export async function exportRecipeToPDF(
  recipe: RecipeForPDF,
  options: ExportOptions = {}
): Promise<void> {
  try {
    // Walidacja podstawowych danych
    if (!recipe.name) {
      throw new Error('Przepis musi mieć nazwę');
    }

    console.log('Generating PDF for recipe:', recipe.name);
    console.log('Recipe data:', {
      id: recipe.id,
      name: recipe.name,
      hasImage: !!recipe.imageUrl,
      ingredientsCount: recipe.ingredients?.length || 0,
      stepsCount: recipe.steps?.length || 0
    });

    // Generate QR Code if needed
    let qrDataUrl: string | undefined;
    if (options.includeQR && recipe.id) {
      try {
        const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/recipes/${recipe.id}`;
        qrDataUrl = await QRCode.toDataURL(qrUrl, { width: QR_GENERATION_SIZE, margin: 1 });
      } catch (error) {
        console.warn('Failed to generate QR code:', error);
        // Kontynuuj bez QR
      }
    }

    // Walidacja obrazu
    let imageUrl = recipe.imageUrl;
    if (options.includeImage && imageUrl) {
      try {
        // Sprawdź czy obraz jest dostępny
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.warn('Image not accessible:', imageUrl);
          imageUrl = undefined;
        }
      } catch (error) {
        console.warn('Failed to validate image:', error);
        imageUrl = undefined;
      }
    }

    // Generate PDF
    const blob = await pdf(
      <RecipePDFDocument
        recipe={{ ...recipe, imageUrl }}
        options={options}
        qrDataUrl={qrDataUrl}
      />
    ).toBlob();

    // Download
    const servingsMultiplier = options.servingsMultiplier || 1;
    const scaledServings = Math.round((recipe.servings || 1) * servingsMultiplier);
    const baseName = sanitizeFileName(recipe.name);
    const servingsSuffix = servingsMultiplier !== 1 ? `_${scaledServings}porcji` : '';
    const fileName = `${baseName}${servingsSuffix}.pdf`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    console.log('PDF generated successfully:', fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);

    // Szczegółowy komunikat błędu
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
    console.error('Error details:', errorMessage);

    throw new Error(`Nie udało się wygenerować PDF: ${errorMessage}`);
  }
}

// Export multiple recipes
export async function exportMultipleRecipesToPDF(
  recipes: RecipeForPDF[],
  bookTitle: string = 'Moja Książka Kucharska',
  options: ExportOptions = {}
): Promise<void> {
  const accentColor = validateColor(options.accentColor);
  const styles = createStyles(accentColor, options.printMode);
  const pageSize = options.pageSize || 'A4';

  const MultiRecipeDocument = (
    <Document
      title={bookTitle}
      author="Family Planner"
      subject={bookTitle}
    >
      {/* Title Page */}
      <Page size={pageSize} style={styles.page}>
        {options.logoUrl && (
          <Image src={options.logoUrl} style={styles.logo} />
        )}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: accentColor, marginBottom: 20 }}>
            {bookTitle}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            {recipes.length} {recipes.length === 1 ? 'przepis' : recipes.length < 5 ? 'przepisy' : 'przepisów'}
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
            Wygenerowano: {new Date().toLocaleDateString('pl-PL')}
          </Text>
        </View>
      </Page>

      {/* Table of Contents */}
      <Page size={pageSize} style={styles.page}>
        <Text style={styles.header}>Spis treści</Text>
        <View style={styles.line} />
        {recipes.map((recipe, index) => (
          <View key={index} style={{ flexDirection: 'row', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', marginRight: 10, color: accentColor }}>
              {index + 1}.
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, marginBottom: 2 }}>
                {recipe.name}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {recipe.category && (
                  <Text style={{ fontSize: 9, color: '#666' }}>
                    {CATEGORY_PL[recipe.category] || recipe.category}
                  </Text>
                )}
                {recipe.difficulty && (
                  <Text style={{ fontSize: 9, color: '#666' }}>
                    {DIFFICULTY_PL[recipe.difficulty]}
                  </Text>
                )}
                {recipe.totalTime && (
                  <Text style={{ fontSize: 9, color: '#666' }}>
                    {formatTime(recipe.totalTime)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </Page>

      {/* Recipes - każdy na osobnej stronie */}
      {recipes.map((recipe, index) => {
        const servingsMultiplier = options.servingsMultiplier || 1;
        const scaledServings = Math.round((recipe.servings || 1) * servingsMultiplier);

        // Grupowanie składników
        const groupedIngredients = recipe.ingredients.reduce((acc, ing) => {
          const category = ing.category || 'Główne składniki';
          if (!acc[category]) acc[category] = [];
          acc[category].push(ing);
          return acc;
        }, {} as Record<string, RecipeIngredient[]>);

        return (
          <Page key={index} size={pageSize} style={styles.page}>
            {/* Header */}
            <Text style={styles.header}>{recipe.name}</Text>
            <View style={styles.line} />

            {recipe.description && (
              <Text style={styles.description}>{recipe.description}</Text>
            )}

            {/* Info */}
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                {recipe.category && (
                  <Text style={styles.infoItem}>
                    Kategoria: {CATEGORY_PL[recipe.category] || recipe.category}
                  </Text>
                )}
                {recipe.difficulty && (
                  <Text style={styles.infoItem}>
                    Trudność: {DIFFICULTY_PL[recipe.difficulty]}
                  </Text>
                )}
                <Text style={styles.infoItem}>Porcje: {scaledServings}</Text>
                {recipe.prepTime && (
                  <Text style={styles.infoItem}>
                    Przygotowanie: {formatTime(recipe.prepTime)}
                  </Text>
                )}
                {recipe.cookTime && (
                  <Text style={styles.infoItem}>
                    Gotowanie: {formatTime(recipe.cookTime)}
                  </Text>
                )}
              </View>
            </View>

            {/* Cooking Method */}
            {(recipe.cookingMethod || recipe.ovenTemp) && (
              <View style={styles.cookingBox}>
                <Text style={styles.cookingBoxTitle}>Metoda gotowania:</Text>
                <Text style={styles.cookingBoxText}>
                  {recipe.cookingMethod && (COOKING_METHOD_PL[recipe.cookingMethod] || recipe.cookingMethod)}
                  {recipe.ovenTemp && ` | ${recipe.ovenTemp}°C`}
                </Text>
              </View>
            )}

            {/* Nutrition */}
            {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat) && (
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.sectionTitle}>Wartości odżywcze:</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {recipe.calories && (
                    <Text style={styles.nutritionItem}>
                      {Math.round(recipe.calories / (recipe.servings || 1))} kcal
                    </Text>
                  )}
                  {recipe.protein && (
                    <Text style={styles.nutritionItem}>
                      B: {Math.round(recipe.protein / (recipe.servings || 1))}g
                    </Text>
                  )}
                  {recipe.carbs && (
                    <Text style={styles.nutritionItem}>
                      W: {Math.round(recipe.carbs / (recipe.servings || 1))}g
                    </Text>
                  )}
                  {recipe.fat && (
                    <Text style={styles.nutritionItem}>
                      T: {Math.round(recipe.fat / (recipe.servings || 1))}g
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Ingredients */}
            <Text style={styles.sectionTitle}>Składniki:</Text>
            {recipe.ingredients.length === 0 ? (
              <Text style={styles.ingredientItem}>Brak składników</Text>
            ) : (
              Object.entries(groupedIngredients).map(([category, ingredients]) => (
                <View key={category}>
                  {Object.keys(groupedIngredients).length > 1 && (
                    <Text style={styles.ingredientCategory}>{category}</Text>
                  )}
                  {ingredients.map((ing, idx) => {
                    const scaledQty = Math.round(ing.quantity * servingsMultiplier * 100) / 100;
                    const qtyStr = scaledQty % 1 === 0 ? scaledQty.toString() : scaledQty.toFixed(1);
                    return (
                      <View key={idx} style={styles.ingredientItem}>
                        {options.includeCheckboxes && <View style={styles.checkbox} />}
                        <Text>• {qtyStr} {ing.unit} - {ing.name}</Text>
                      </View>
                    );
                  })}
                </View>
              ))
            )}

            {/* Steps */}
            <Text style={styles.sectionTitle}>Przygotowanie:</Text>
            {recipe.steps.length === 0 ? (
              <Text style={styles.stepInstruction}>Brak kroków</Text>
            ) : (
              recipe.steps.slice(0, 10).map((step) => (
                <View key={step.order} style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepNumber}>{step.order}</Text>
                    {step.timeMinutes && (
                      <Text style={styles.stepTime}>{formatTime(step.timeMinutes)}</Text>
                    )}
                  </View>
                  <Text style={styles.stepInstruction}>{step.instruction}</Text>
                </View>
              ))
            )}

            {recipe.tips && (
              <View style={styles.tipsBox}>
                <Text style={styles.tipsBoxTitle}>💡 Wskazówki:</Text>
                <Text style={styles.tipsBoxText}>{recipe.tips}</Text>
              </View>
            )}

            <Text style={styles.footer} fixed>
              {bookTitle} - Strona {index + 3}
            </Text>
          </Page>
        );
      })}
    </Document>
  );

  try {
    const blob = await pdf(MultiRecipeDocument).toBlob();
    const fileName = sanitizeFileName(bookTitle);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Nie udało się wygenerować książki kucharskiej PDF.');
  }
}

