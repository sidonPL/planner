'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  reward: number;
  isActive: boolean;
}

export function QuestTemplatesManagement() {
  const [templates, setTemplates] = useState<QuestTemplate[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'TASKS',
    target: 1,
    reward: 10,
    isActive: true,
  });

  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/gamification/quest-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadTemplates();
    }, 0);

    return () => clearTimeout(timeout);
  }, [loadTemplates]);

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/gamification/quest-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Szablon utworzony!');
        setCreating(false);
        resetForm();
        loadTemplates();
      } else {
        toast.error('Błąd tworzenia szablonu');
      }
    } catch {
      toast.error('Błąd połączenia');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/gamification/quest-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Szablon zaktualizowany!');
        setEditing(null);
        resetForm();
        loadTemplates();
      } else {
        toast.error('Błąd aktualizacji');
      }
    } catch {
      toast.error('Błąd połączenia');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno usunąć ten szablon?')) return;

    try {
      const response = await fetch(`/api/admin/gamification/quest-templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Szablon usunięty');
        loadTemplates();
      } else {
        toast.error('Błąd usuwania');
      }
    } catch {
      toast.error('Błąd połączenia');
    }
  };

  const startEdit = (template: QuestTemplate) => {
    setEditing(template.id);
    setFormData({
      title: template.title,
      description: template.description,
      type: template.type,
      target: template.target,
      reward: template.reward,
      isActive: template.isActive,
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'TASKS',
      target: 1,
      reward: 10,
      isActive: true,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Szablony Daily Quests</CardTitle>
              <CardDescription>
                Zarządzaj szablonami zadań dziennych. System losuje 3 z dostępnych.
              </CardDescription>
            </div>
            <Button onClick={() => setCreating(true)} disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              Nowy szablon
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Form */}
          {creating && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Nowy szablon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tytuł</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="np. Wykonaj 3 zadania"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Typ</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TASKS">Zadania</SelectItem>
                        <SelectItem value="RECIPES">Przepisy</SelectItem>
                        <SelectItem value="MEALS">Posiłki</SelectItem>
                        <SelectItem value="SHOPPING">Zakupy</SelectItem>
                        <SelectItem value="INVENTORY">Inwentarz</SelectItem>
                        <SelectItem value="ROUTINES">Rutyny</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cel (target)</Label>
                    <Input
                      type="number"
                      value={formData.target}
                      onChange={(e) =>
                        setFormData({ ...formData, target: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nagroda (XP)</Label>
                    <Input
                      type="number"
                      value={formData.reward}
                      onChange={(e) =>
                        setFormData({ ...formData, reward: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="np. Ukończ dowolne 3 zadania z listy"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} className="flex-1">
                    <Save className="mr-2 h-4 w-4" />
                    Zapisz
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreating(false);
                      resetForm();
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Anuluj
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Templates List */}
          <div className="space-y-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="pt-6">
                  {editing === template.id ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Tytuł</Label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Typ</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TASKS">Zadania</SelectItem>
                              <SelectItem value="RECIPES">Przepisy</SelectItem>
                              <SelectItem value="MEALS">Posiłki</SelectItem>
                              <SelectItem value="SHOPPING">Zakupy</SelectItem>
                              <SelectItem value="INVENTORY">Inwentarz</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Cel</Label>
                          <Input
                            type="number"
                            value={formData.target}
                            onChange={(e) =>
                              setFormData({ ...formData, target: parseInt(e.target.value) })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nagroda (XP)</Label>
                          <Input
                            type="number"
                            value={formData.reward}
                            onChange={(e) =>
                              setFormData({ ...formData, reward: parseInt(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Opis</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdate(template.id)} className="flex-1">
                          <Save className="mr-2 h-4 w-4" />
                          Zapisz
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditing(null);
                            resetForm();
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{template.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <div className="flex gap-4 mt-2">
                          <span className="text-sm">
                            <span className="font-medium">Typ:</span> {template.type}
                          </span>
                          <span className="text-sm">
                            <span className="font-medium">Cel:</span> {template.target}
                          </span>
                          <span className="text-sm text-yellow-600 font-medium">
                            +{template.reward} XP
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(template)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak szablonów. Dodaj pierwszy!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

