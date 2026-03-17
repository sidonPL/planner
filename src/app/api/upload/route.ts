import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Dozwolone typy plików
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf"
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (zwiększone dla PDF)

// Katalog na uploady
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "misc";

    if (!file) {
      return NextResponse.json({ error: "Brak pliku" }, { status: 400 });
    }

    // Sprawdź typ pliku
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Niedozwolony typ pliku. Dozwolone: JPG, PNG, WebP, GIF, PDF" },
        { status: 400 }
      );
    }

    // Sprawdź rozmiar pliku
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Plik jest za duży. Maksymalny rozmiar: 10MB" },
        { status: 400 }
      );
    }

    // Utwórz katalog jeśli nie istnieje
    const uploadPath = path.join(UPLOAD_DIR, folder);
    if (!existsSync(uploadPath)) {
      await mkdir(uploadPath, { recursive: true });
    }

    // Generuj unikalną nazwę pliku
    const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(uploadPath, filename);

    // Zapisz plik
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Zwróć URL do pliku
    const url = `/uploads/${folder}/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Błąd podczas uploadu pliku:", error);
    return NextResponse.json(
      { error: "Nie udało się zapisać pliku" },
      { status: 500 }
    );
  }
}

// GET - informacje o konfiguracji uploadu
export async function GET() {
  return NextResponse.json({
    allowedTypes: ALLOWED_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeFormatted: "10MB",
  });
}

