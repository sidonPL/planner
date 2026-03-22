"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Template = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  createdAt: Date;
  taskTemplates: {
    id: string;
    title: string;
    priority: string;
  }[];
  creator: {
    id: string;
    name: string | null;
  };
};

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
};

type Member = {
  id: string;
  name: string | null;
};

interface TemplatesManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  members: Member[];
  onTemplateUsed?: (payload?: {
    parentTaskId?: string;
    tasks?: Array<{ id: string }>;
  }) => void | Promise<void>;
}

export function TemplatesManagerDialog({
  open,
  onOpenChange,
  members,
  onTemplateUsed,
}: TemplatesManagerDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUsing, setIsUsing] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIcon, setNewIcon] = useState("📋");
  const [newTasks, setNewTasks] = useState<Array<{ title: string; priority: string }>>([
    { title: "", priority: "MEDIUM" },
  ]);

  // Use form
  const [parentTaskTitle, setParentTaskTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("none");

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/templates", { cache: "no-store" });
      if (!response.ok) {
        console.error(`Failed to load templates (${response.status})`);
        toast.error("Nie udało się załadować szablonów zadań");
        return;
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error("Invalid templates payload");
        toast.error("Nieprawidłowa odpowiedź serwera dla szablonów");
        return;
      }

      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Nie udało się załadować szablonów zadań");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim()) {
      toast.error("Podaj nazwę szablonu");
      return;
    }

    const validTasks = newTasks.filter((t) => t.title.trim());
    if (validTasks.length === 0) {
      toast.error("Dodaj przynajmniej jedno zadanie");
      return;
    }

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          icon: newIcon,
          taskTemplates: validTasks,
        }),
      });

      if (response.ok) {
        const newTemplate = await response.json();
        setTemplates([newTemplate, ...templates]);
        setIsCreating(false);
        setNewName("");
        setNewDescription("");
        setNewIcon("📋");
        setNewTasks([{ title: "", priority: "MEDIUM" }]);
        toast.success("Utworzono szablon");
      } else {
        toast.error("Nie udało się utworzyć szablonu");
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleUseTemplate = async () => {
    if (!selectedTemplate || isApplyingTemplate) return;

    setIsApplyingTemplate(true);
    const clientRequestId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentTaskTitle: parentTaskTitle.trim() || null,
          assigneeId: assigneeId && assigneeId !== "none" ? assigneeId : null,
          clientRequestId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Utworzono ${result.tasksCreated} zadań z szablonu`);
        setIsUsing(false);
        setSelectedTemplate(null);
        setParentTaskTitle("");
        setAssigneeId("");
        onTemplateUsed?.({
          parentTaskId: result.parentTaskId,
          tasks: Array.isArray(result.tasks) ? result.tasks : [],
        });
      } else {
        toast.error("Nie udało się użyć szablonu");
      }
    } catch (error) {
      console.error("Error using template:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten szablon?")) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== templateId));
        toast.success("Usunięto szablon");
      } else {
        toast.error("Nie udało się usunąć szablonu");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Wystąpił błąd");
    }
  };

  if (isCreating) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nowy szablon zadań</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="w-16 text-center text-2xl"
                placeholder="📋"
              />
              <Input
                placeholder="Nazwa szablonu (np. Cotygodniowe sprzątanie)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Opis (opcjonalnie)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Zadania w szablonie:</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewTasks([...newTasks, { title: "", priority: "MEDIUM" }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj
                </Button>
              </div>
              {newTasks.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Zadanie ${index + 1}`}
                    value={task.title}
                    onChange={(e) => {
                      const updated = [...newTasks];
                      updated[index].title = e.target.value;
                      setNewTasks(updated);
                    }}
                    className="flex-1"
                  />
                  <Select
                    value={task.priority}
                    onValueChange={(value) => {
                      const updated = [...newTasks];
                      updated[index].priority = value;
                      setNewTasks(updated);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Niski</SelectItem>
                      <SelectItem value="MEDIUM">Średni</SelectItem>
                      <SelectItem value="HIGH">Wysoki</SelectItem>
                      <SelectItem value="URGENT">Pilny</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setNewTasks(newTasks.filter((_, i) => i !== index))}
                    disabled={newTasks.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreateTemplate}>Utwórz szablon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (isUsing && selectedTemplate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Użyj szablonu: {selectedTemplate.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Utworzy {selectedTemplate.taskTemplates.length} zadań
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tytuł głównego zadania (opcjonalnie)
              </label>
              <Input
                placeholder="np. Sprzątanie - 10 grudnia"
                value={parentTaskTitle}
                onChange={(e) => setParentTaskTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Jeśli podasz, wszystkie zadania będą podzadaniami
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Przypisz do (opcjonalnie)</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nie przypisane" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nie przypisane</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (isApplyingTemplate) return;
                setIsUsing(false);
                setSelectedTemplate(null);
              }}
              disabled={isApplyingTemplate}
            >
              Anuluj
            </Button>
            <Button onClick={handleUseTemplate} disabled={isApplyingTemplate}>
              {isApplyingTemplate ? "Tworzenie..." : "Utwórz zadania"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Szablony zadań
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={() => setIsCreating(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Nowy szablon
          </Button>

          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Ładowanie...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Brak szablonów</p>
              <p className="text-xs mt-1">Utwórz pierwszy szablon!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div key={template.id} className="p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon || "📋"}</span>
                        <h3 className="font-medium">{template.name}</h3>
                        <Badge variant="secondary">{template.taskTemplates.length} zadań</Badge>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Autor: {template.creator.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isApplyingTemplate}
                        onClick={() => {
                          if (isApplyingTemplate) return;
                          setSelectedTemplate(template);
                          setIsUsing(true);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Użyj
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

