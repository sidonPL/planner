import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// GET - Pobierz załączniki zadania
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                avatar: true,
                color: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task.attachments);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Upload załącznika
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy zadanie należy do gospodarstwa
    const task = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Walidacja rozmiaru pliku (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Przygotuj ścieżkę
    const uploadDir = join(process.cwd(), "public", "uploads", "tasks", id);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generuj unikalną nazwę pliku
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${timestamp}-${sanitizedFileName}`;
    const filePath = join(uploadDir, fileName);

    // Zapisz plik
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Zapisz w bazie danych
    const fileUrl = `/uploads/tasks/${id}/${fileName}`;
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: id,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: session.user.id,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

