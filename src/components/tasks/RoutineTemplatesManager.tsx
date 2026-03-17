"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Clock, Loader2, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RoutineTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  tasks: Array<{
    title: string;
    time: string;
    priority: string;
  }>;
  isPublic: boolean;
  createdBy: string | null;
  creator?: {
    id: string;
    name: string | null;
  };
}

interface RoutineTemplatesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateChanged?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "morning", label: "🌅 Poranne" },
  { value: "evening", label: "🌙 Wieczorne" },
  { value: "daily", label: "📅 Codzienne" },
  { value: "weekly", label: "📆 Tygodniowe" },
  { value: "monthly", label: "🗓️ Miesięczne" },
];

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "🔴 Pilne" },
  { value: "HIGH", label: "🟠 Wysokie" },
  { value: "MEDIUM", label: "🔵 Średnie" },
  { value: "LOW", label: "🟢 Niskie" },
];

const ICON_OPTIONS = ["🌅", "🌙", "🧹", "💰", "💊", "☕", "🐕", "📋", "✨", "🎯", "💪", "🧘", "🏃", "📖", "🎵"];

export function RoutineTemplatesManager({
  open,
  onOpenChange,
  onTemplateChanged,
}: RoutineTemplatesManagerProps) {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RoutineTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "📋",
    category: "daily",
    tasks: [{ title: "", time: "09:00", priority: "MEDIUM" }] as Array<{
      title: string;
      time: string;
      priority: string;
    }>,
  });

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        description: editingTemplate.description || "",
        icon: editingTemplate.icon || "📋",
        category: editingTemplate.category,
        tasks: editingTemplate.tasks,
      });
    }
  }, [editingTemplate]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/routine-templates");
      if (response.ok) {
        const data = await response.json();
        // Filtruj tylko własne (niepubliczne) szablony
        setTemplates(data.filter((t: RoutineTemplate) => !t.isPublic));
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować szablonów",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Błąd",
        description: "Podaj nazwę szablonu",
        variant: "destructive",
      });
      return;
    }

    const validTasks = formData.tasks.filter((t) => t.title.trim());
    if (validTasks.length === 0) {
      toast({
        title: "Błąd",
        description: "Dodaj przynajmniej jedno zadanie",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingTemplate
        ? `/api/routine-templates/${editingTemplate.id}`
        : "/api/routine-templates";

      const method = editingTemplate ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          icon: formData.icon,
          category: formData.category,
          tasks: validTasks,
        }),
      });

      if (response.ok) {
        toast({
          title: "✅ Sukces",
          description: editingTemplate
            ? "Szablon został zaktualizowany"
            : "Szablon został utworzony",
        });
        resetForm();
        loadTemplates();
        onTemplateChanged?.();
      } else {
        throw new Error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać szablonu",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten szablon?")) {
      return;
    }

    setDeletingId(templateId);
    try {
      const response = await fetch(`/api/routine-templates/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "✅ Usunięto",
          description: "Szablon został usunięty",
        });
        loadTemplates();
        onTemplateChanged?.();
      } else {
        throw new Error("Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć szablonu",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      icon: "📋",
      category: "daily",
      tasks: [{ title: "", time: "09:00", priority: "MEDIUM" }],
    });
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, { title: "", time: "09:00", priority: "MEDIUM" }],
    });
  };

  const removeTask = (index: number) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index),
    });
  };

  const updateTask = (index: number, field: string, value: string) => {
    const newTasks = [...formData.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setFormData({ ...formData, tasks: newTasks });
  };

  if (isCreating || editingTemplate) {
    return (
      <Dialog open={open} onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edytuj szablon rutyny" : "Nowy szablon rutyny"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Zaktualizuj szczegóły szablonu rutyny"
                : "Utwórz własny szablon rutyny z zadaniami"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-[auto_1fr] gap-4">
                <div className="space-y-2">
                  <Label>Ikona</Label>
                  <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          <span className="text-2xl">{icon}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nazwa szablonu</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="np. Moja poranna rutyna"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis (opcjonalnie)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Dodaj opis szablonu..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategoria</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Zadania w rutynie</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTask}>
                    <Plus className="h-4 w-4 mr-1" />
                    Dodaj zadanie
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.tasks.map((task, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid gap-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                value={task.title}
                                onChange={(e) => updateTask(index, "title", e.target.value)}
                                placeholder="Nazwa zadania"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTask(index)}
                              disabled={formData.tasks.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Godzina</Label>
                              <Input
                                type="time"
                                value={task.time}
                                onChange={(e) => updateTask(index, "time", e.target.value)}
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Priorytet</Label>
                              <Select
                                value={task.priority}
                                onValueChange={(value) => updateTask(index, "priority", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRIORITY_OPTIONS.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                      {p.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit}>
              {editingTemplate ? "Zapisz zmiany" : "Utwórz szablon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Zarządzaj szablonami rutyn
          </DialogTitle>
          <DialogDescription>
            Twórz, edytuj i usuwaj własne szablony rutyn
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="mb-4">
            <Button onClick={() => setIsCreating(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Nowy szablon rutyny
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">Brak własnych szablonów</h3>
              <p className="text-muted-foreground mb-4">
                Utwórz pierwszy szablon rutyny aby szybko dodawać powtarzające się zadania
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Utwórz szablon
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="grid gap-4 md:grid-cols-2 pr-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{template.icon || "📋"}</span>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">{template.description}</CardDescription>
                          )}
                          <Badge variant="outline" className="mt-2">
                            {CATEGORY_OPTIONS.find((c) => c.value === template.category)?.label || template.category}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Zadania ({template.tasks.length}):
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {template.tasks.map((task, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-sm bg-muted/30 rounded px-2 py-1"
                            >
                              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-muted-foreground min-w-[45px]">
                                {task.time}
                              </span>
                              <span className="flex-1">{task.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edytuj
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDelete(template.id)}
                        disabled={deletingId === template.id}
                      >
                        {deletingId === template.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Usuń
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

