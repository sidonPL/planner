import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-error-handler";
import { parseRecipeWithGemini } from "@/lib/gemini-recipe-parser";

/**
 * POST /api/recipes/import/ocr
 *
 * Import recipe from image using OCR
 *
 * Body: {
 *   image: string; // base64 or URL
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // For now, we'll use Gemini Vision API to extract text from image
    // Alternative: Tesseract.js on client-side or Google Cloud Vision

    const extractedText = await extractTextFromImage(image);

    if (!extractedText) {
      return NextResponse.json(
        { error: "Could not extract text from image" },
        { status: 422 }
      );
    }

    // Use Gemini to parse the extracted text into recipe structure
    const parsedRecipe = await parseRecipeWithGemini(extractedText, "OCR Import");

    if (!parsedRecipe) {
      return NextResponse.json(
        { error: "Could not parse recipe from extracted text" },
        { status: 422 }
      );
    }

    // Add metadata
    const recipeWithMetadata = {
      ...parsedRecipe,
      source: "OCR Import",
      image: typeof image === "string" && image.startsWith("http") ? image : null,
    };

    return NextResponse.json({
      recipe: recipeWithMetadata,
      extractedText, // Return for preview/editing
    });
  } catch (error) {
    console.error("OCR import error:", error);
    return handleApiError(error);
  }
}

/**
 * Extract text from image using Gemini Vision or OCR
 */
async function extractTextFromImage(image: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY not configured");
    return null;
  }

  try {
    // Use Gemini Vision API to extract text from image
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Extract all text from this image. If it's a recipe, extract the recipe name, ingredients list, and cooking instructions. Format it clearly with sections.",
              },
              {
                inline_data: {
                  mime_type: image.startsWith("data:image/")
                    ? image.split(";")[0].split(":")[1]
                    : "image/jpeg",
                  data: image.startsWith("data:")
                    ? image.split(",")[1]
                    : image, // Assume base64 if not data URL
                },
              },
            ],
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini Vision API error:", await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return text || null;
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return null;
  }
}

