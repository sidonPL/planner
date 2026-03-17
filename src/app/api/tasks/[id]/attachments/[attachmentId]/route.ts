import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// DELETE - Usuń załącznik
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attachmentId } = await params;

    // Znajdź załącznik
    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        task: {
          householdId: session.user.householdId,
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Sprawdź uprawnienia - tylko uploader lub admin może usunąć
    if (attachment.uploadedBy !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Usuń plik z dysku
    const filePath = join(process.cwd(), "public", attachment.fileUrl);
    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
      } catch (error) {
        console.error("Error deleting file:", error);
        // Kontynuuj mimo błędu usuwania pliku
      }
    }

    // Usuń z bazy danych
    await prisma.taskAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

