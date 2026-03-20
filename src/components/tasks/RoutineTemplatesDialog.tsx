"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Sparkles, Loader2, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RoutineTemplatesManager } from "./RoutineTemplatesManager";

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
}

interface RoutineTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUsed?: () => void;
}

export function RoutineTemplatesDialog({
  open,
  onOpenChange,
  onTemplateUsed,
}: RoutineTemplatesDialogProps) {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/routine-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
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
  }, [toast]);

  useEffect(() => {
    if (open) {
      void loadTemplates();
    }
  }, [open, loadTemplates]);

  const handleUseTemplate = async (templateId: string) => {
    setUsingTemplateId(templateId);
    try {
      const response = await fetch(`/api/routine-templates/${templateId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const tasks = await response.json();
        toast({
          title: "✨ Szablon użyty!",
          description: `Utworzono ${tasks.length} zadań z szablonu`,
        });
        onTemplateUsed?.();
        onOpenChange(false);
      } else {
        throw new Error("Failed to use template");
      }
    } catch (error) {
      console.error("Error using template:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się użyć szablonu",
        variant: "destructive",
      });
    } finally {
      setUsingTemplateId(null);
    }
  };

  const groupedTemplates = {
    morning: templates.filter((t) => t.category === "morning"),
    evening: templates.filter((t) => t.category === "evening"),
    daily: templates.filter((t) => t.category === "daily"),
    weekly: templates.filter((t) => t.category === "weekly"),
    monthly: templates.filter((t) => t.category === "monthly"),
  };

  const TemplateCard = ({ template }: { template: RoutineTemplate }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl flex-shrink-0">{template.icon || "📋"}</span>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base break-words">{template.name}</CardTitle>
            {template.description && (
              <CardDescription className="mt-1 text-xs line-clamp-2">
                {template.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Zadania ({template.tasks.length}):
          </p>
          <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
            {template.tasks.map((task, index) => (
              <div
                key={index}
                className="flex items-start gap-1.5 text-xs bg-muted/30 rounded p-2"
              >
                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="font-medium text-muted-foreground w-[42px] flex-shrink-0 text-[11px]">
                  {task.time}
                </span>
                <span className="flex-1 break-words leading-tight min-w-0">
                  {task.title}
                </span>
                <span className="flex-shrink-0 text-sm leading-none">
                  {task.priority === "URGENT" && "🔴"}
                  {task.priority === "HIGH" && "🟠"}
                  {task.priority === "MEDIUM" && "🔵"}
                  {task.priority === "LOW" && "🟢"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          onClick={() => handleUseTemplate(template.id)}
          disabled={usingTemplateId === template.id}
          className="w-full"
          size="sm"
        >
          {usingTemplateId === template.id ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Tworzenie...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Użyj szablonu
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Szablony rutyn
                </DialogTitle>
                <DialogDescription>
                  Wybierz gotowy szablon rutyny, aby szybko utworzyć zadania
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManager(true)}
                className="flex-shrink-0"
              >
                <Settings className="mr-2 h-4 w-4" />
                Zarządzaj własnymi
              </Button>
            </div>
          </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="morning" className="flex-1 overflow-hidden flex flex-col">
            <div className="space-y-2">
              {/* Pierwszy wiersz - 3 zakładki */}
              <TabsList className="grid w-full grid-cols-3 gap-2">
                <TabsTrigger value="morning" className="flex items-center gap-2 justify-center">
                  <span className="text-base">🌅</span>
                  <span className="text-sm">Poranne</span>
                  {groupedTemplates.morning.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {groupedTemplates.morning.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="evening" className="flex items-center gap-2 justify-center">
                  <span className="text-base">🌙</span>
                  <span className="text-sm">Wieczorne</span>
                  {groupedTemplates.evening.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {groupedTemplates.evening.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="daily" className="flex items-center gap-2 justify-center">
                  <span className="text-base">📅</span>
                  <span className="text-sm">Codzienne</span>
                  {groupedTemplates.daily.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {groupedTemplates.daily.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Drugi wiersz - 2 zakładki */}
              <TabsList className="grid w-full grid-cols-2 gap-2">
                <TabsTrigger value="weekly" className="flex items-center gap-2 justify-center">
                  <span className="text-base">📆</span>
                  <span className="text-sm">Tygodniowe</span>
                  {groupedTemplates.weekly.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {groupedTemplates.weekly.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex items-center gap-2 justify-center">
                  <span className="text-base">🗓️</span>
                  <span className="text-sm">Miesięczne</span>
                  {groupedTemplates.monthly.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {groupedTemplates.monthly.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-2">
              <TabsContent value="morning" className="mt-0">
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {groupedTemplates.morning.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
                {groupedTemplates.morning.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Brak szablonów porannych rutyn
                  </p>
                )}
              </TabsContent>

              <TabsContent value="evening" className="mt-0">
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {groupedTemplates.evening.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
                {groupedTemplates.evening.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Brak szablonów wieczornych rutyn
                  </p>
                )}
              </TabsContent>

              <TabsContent value="daily" className="mt-0">
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {groupedTemplates.daily.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
                {groupedTemplates.daily.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Brak szablonów codziennych rutyn
                  </p>
                )}
              </TabsContent>

              <TabsContent value="weekly" className="mt-0">
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {groupedTemplates.weekly.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
                {groupedTemplates.weekly.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Brak szablonów tygodniowych rutyn
                  </p>
                )}
              </TabsContent>

              <TabsContent value="monthly" className="mt-0">
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {groupedTemplates.monthly.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
                {groupedTemplates.monthly.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Brak szablonów miesięcznych rutyn
                  </p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>

    <RoutineTemplatesManager
      open={showManager}
      onOpenChange={setShowManager}
      onTemplateChanged={loadTemplates}
    />
  </>
  );
}

