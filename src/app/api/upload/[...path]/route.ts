import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: "Brak ścieżki pliku" }, { status: 400 });
    }

    // Złóż ścieżkę z segmentów
    const relativePath = pathSegments.join("/");
    const filepath = path.join(UPLOAD_DIR, relativePath);

    // Bezpieczeństwo - upewnij się że ścieżka jest wewnątrz UPLOAD_DIR
    const normalizedPath = path.normalize(filepath);
    if (!normalizedPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: "Nieprawidłowa ścieżka" }, { status: 400 });
    }

    // Sprawdź czy plik istnieje
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: "Plik nie istnieje" }, { status: 404 });
    }

    // Usuń plik
    await unlink(filepath);

    return NextResponse.json({
      success: true,
      message: "Plik został usunięty",
    });
  } catch (error) {
    console.error("Błąd podczas usuwania pliku:", error);
    return NextResponse.json(
      { error: "Nie udało się usunąć pliku" },
      { status: 500 }
    );
  }
}

