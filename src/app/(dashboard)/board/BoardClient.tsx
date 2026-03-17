"use client";

import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Plus,
  Pin,
  PinOff,
  Trash2,
  Edit,
  MoreVertical,
  StickyNote,
  GripVertical,
  Eye,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BoardNote } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DrawingEditor } from "@/components/board/DrawingEditor";
import { DrawingViewer } from "@/components/board/DrawingViewer";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

type NoteWithAuthor = BoardNote & {
  author: { id: string; name: string | null; color: string };
  isRead?: boolean;
  drawing?: string | null; // Jawne dodanie dla TypeScript
};

type Member = {
  id: string;
  name: string | null;
  color: string;
};

interface BoardClientProps {
  notes: NoteWithAuthor[];
  members: Member[];
  currentUserId: string;
}

const noteColors = [
  { value: "#FEF3C7", label: "Żółty" },
  { value: "#DBEAFE", label: "Niebieski" },
  { value: "#D1FAE5", label: "Zielony" },
  { value: "#FCE7F3", label: "Różowy" },
  { value: "#E9D5FF", label: "Fioletowy" },
  { value: "#F3F4F6", label: "Szary" },
];

// Komponent sortable notatki
function SortableNoteCard({
  note,
  onDelete,
  onTogglePin,
  onEdit,
  onMarkAsRead,
  isOwner,
}: {
  note: NoteWithAuthor;
  onDelete: (id: string) => void;
  onTogglePin: (note: NoteWithAuthor) => void;
  onEdit: (note: NoteWithAuthor) => void;
  onMarkAsRead: (note: NoteWithAuthor) => void;
  isOwner: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={{ ...style, backgroundColor: note.color || "#FEF3C7" }}
      className={cn(
        "relative transition-shadow hover:shadow-md",
        !note.isRead && !isOwner && "ring-2 ring-blue-500"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-black/5"
            >
              <GripVertical className="h-4 w-4 text-gray-600" />
            </button>
            <Avatar className="h-6 w-6">
              <AvatarFallback
                style={{ backgroundColor: note.author.color }}
                className="text-white text-xs"
              >
                {note.author.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-700">
              {note.author.name}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTogglePin(note)}>
                {note.isPinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" />
                    Odepnij
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    Przypnij
                  </>
                )}
              </DropdownMenuItem>
              {!note.isRead && !isOwner && (
                <DropdownMenuItem onClick={() => onMarkAsRead(note)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Oznacz jako przeczytane
                </DropdownMenuItem>
              )}
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(note)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edytuj
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(note.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {note.content && (
          <p className="text-sm whitespace-pre-wrap text-gray-900">{note.content}</p>
        )}

        {note.drawing && (
          <div className="mt-3">
            <DrawingViewer
              drawing={note.drawing}
              className="w-full rounded border border-border bg-white"
            />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {format(new Date(note.createdAt), "d MMM, HH:mm", { locale: pl })}
          </span>
          {note.isPinned && (
            <Pin className="h-3 w-3 text-gray-600" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BoardClient({ notes: initialNotes, currentUserId }: BoardClientProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteWithAuthor | null>(null);

  const [newNote, setNewNote] = useState({
    content: "",
    color: "#FEF3C7",
    drawing: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = notes.findIndex((n) => n.id === active.id);
    const newIndex = notes.findIndex((n) => n.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedNotes = arrayMove(notes, oldIndex, newIndex);
    setNotes(reorderedNotes);

    // Zapisz nową kolejność na serwerze
    try {
      await fetch("/api/board/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteIds: reorderedNotes.map((n) => n.id),
        }),
      });
    } catch {
      // Jeśli się nie uda, przywróć poprzednią kolejność
      setNotes(notes);
      toast.error("Nie udało się zapisać kolejności");
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.content.trim() && !newNote.drawing) {
      toast.error("Notatka musi zawierać tekst lub rysunek");
      return;
    }

    try {
      const isEditing = !!editingNote;
      const url = isEditing ? `/api/board/${editingNote.id}` : "/api/board";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNote),
      });

      if (response.ok) {
        const savedNote = await response.json();
        if (isEditing) {
          setNotes(notes.map((n) => (n.id === savedNote.id ? savedNote : n)));
        } else {
          setNotes([savedNote, ...notes]);
        }
        setIsAddDialogOpen(false);
        setEditingNote(null);
        setNewNote({ content: "", color: "#FEF3C7", drawing: "" });
        toast.success(isEditing ? "Notatka zaktualizowana" : "Notatka dodana");
      }
    } catch {
      toast.error("Nie udało się zapisać notatki");
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const response = await fetch(`/api/board/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotes(notes.filter((n) => n.id !== id));
        toast.success("Notatka usunięta");
      }
    } catch {
      toast.error("Nie udało się usunąć notatki");
    }
  };

  const handleTogglePin = async (note: NoteWithAuthor) => {
    try {
      const response = await fetch(`/api/board/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });

      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(
          notes
            .map((n) => (n.id === updatedNote.id ? updatedNote : n))
            .sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
        );
        toast.success(updatedNote.isPinned ? "Przypięto" : "Odpięto");
      }
    } catch {
      toast.error("Nie udało się zaktualizować");
    }
  };

  const handleEditNote = (note: NoteWithAuthor) => {
    setEditingNote(note);
    setNewNote({
      content: note.content,
      color: note.color || "#FEF3C7",
      drawing: note.drawing || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleMarkAsRead = async (note: NoteWithAuthor) => {
    try {
      const response = await fetch(`/api/board/${note.id}/read`, {
        method: "POST",
      });

      if (response.ok) {
        setNotes(notes.map((n) =>
          n.id === note.id ? { ...n, isRead: true } : n
        ));
        toast.success("Oznaczono jako przeczytane");
      }
    } catch {
      toast.error("Nie udało się oznaczyć jako przeczytane");
    }
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const regularNotes = notes.filter((n) => !n.isPinned);
  const unreadCount = notes.filter(n => !n.isRead && n.authorId !== currentUserId).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tablica rodzinna
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
                {unreadCount} nowe
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Wspólne notatki i wiadomości dla całej rodziny
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nowa notatka
        </Button>
      </div>

      {/* Brak notatek */}
      {notes.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Brak notatek</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Dodaj pierwszą notatkę dla całej rodziny
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nowa notatka
            </Button>
          </CardContent>
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* Przypięte notatki */}
        {pinnedNotes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Pin className="h-4 w-4" />
              Przypięte
            </h2>
            <SortableContext
              items={pinnedNotes.map((n) => n.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {pinnedNotes.map((note) => (
                  <SortableNoteCard
                    key={note.id}
                    note={note}
                    onDelete={handleDeleteNote}
                    onTogglePin={handleTogglePin}
                    onEdit={handleEditNote}
                    onMarkAsRead={handleMarkAsRead}
                    isOwner={note.authorId === currentUserId}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        )}

        {/* Wszystkie notatki */}
        {regularNotes.length > 0 && (
          <div className="space-y-3">
            {pinnedNotes.length > 0 && (
              <h2 className="text-sm font-medium text-muted-foreground">Wszystkie notatki</h2>
            )}
            <SortableContext
              items={regularNotes.map((n) => n.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {regularNotes.map((note) => (
                  <SortableNoteCard
                    key={note.id}
                    note={note}
                    onDelete={handleDeleteNote}
                    onTogglePin={handleTogglePin}
                    onEdit={handleEditNote}
                    onMarkAsRead={handleMarkAsRead}
                    isOwner={note.authorId === currentUserId}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        )}
      </DndContext>

      {/* Dialog dodawania/edycji */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingNote(null);
            setNewNote({ content: "", color: "#FEF3C7", drawing: "" });
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Edytuj notatkę" : "Nowa notatka"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">
                  <StickyNote className="mr-2 h-4 w-4" />
                  Tekst
                </TabsTrigger>
                <TabsTrigger value="drawing">
                  <Palette className="mr-2 h-4 w-4" />
                  Rysunek
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label>Treść</Label>
                  <Textarea
                    placeholder="Napisz wiadomość dla rodziny..."
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    rows={6}
                  />
                </div>
              </TabsContent>

              <TabsContent value="drawing">
                <DrawingEditor
                  initialDrawing={newNote.drawing}
                  onDrawingChange={(drawing) => setNewNote({ ...newNote, drawing })}
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>Kolor notatki</Label>
              <div className="flex gap-2">
                {noteColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewNote({ ...newNote, color: color.value })}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      newNote.color === color.value
                        ? "border-primary scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveNote}>
              {editingNote ? "Zapisz zmiany" : "Dodaj notatkę"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

