import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BoardClient } from "./BoardClient";

export default async function BoardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const [notes, members, readNotes] = await Promise.all([
    prisma.boardNote.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { position: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    }),
    // Pobierz ID notatek przeczytanych przez użytkownika
    prisma.boardNoteRead.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        noteId: true,
      },
    }),
  ]);

  const readNoteIds = readNotes.map(r => r.noteId);

  // Oznacz notatki jako przeczytane
  const notesWithReadStatus = notes.map(note => ({
    ...note,
    isRead: readNoteIds.includes(note.id) || note.authorId === session.user.id,
  }));

  return (
    <BoardClient
      notes={notesWithReadStatus}
      members={members}
      currentUserId={session.user.id}
    />
  );
}
