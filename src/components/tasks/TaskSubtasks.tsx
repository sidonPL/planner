"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TaskStatus } from "@prisma/client";

type Subtask = {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
  } | null;
};

type Member = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
};

interface TaskSubtasksProps {
  taskId: string;
  members: Member[];
  onSubtaskChange?: () => void; // Callback do odświeżenia licznika w rodzicu
}

export function TaskSubtasks({ taskId, members, onSubtaskChange }: TaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState<string>("unassigned");

  const loadSubtasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (response.ok) {
        const data = await response.json();
        setSubtasks(data);
      }
    } catch (error) {
      console.error("Error loading subtasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadSubtasks();
  }, [loadSubtasks]);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) {
      toast.error("Podaj tytuł podzadania");
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          assigneeId: newSubtaskAssignee === "unassigned" ? null : newSubtaskAssignee,
        }),
      });

      if (response.ok) {
        const newSubtask = await response.json();
        setSubtasks([...subtasks, newSubtask]);
        setNewSubtaskTitle("");
        setNewSubtaskAssignee("unassigned");
        setIsAdding(false);
        toast.success("Dodano podzadanie");
        onSubtaskChange?.(); // Odśwież licznik w rodzicu
      } else {
        toast.error("Nie udało się dodać podzadania");
      }
    } catch (error) {
      console.error("Error adding subtask:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    // Optimistic update
    const newStatus: TaskStatus = completed ? TaskStatus.COMPLETED : TaskStatus.TODO;
    setSubtasks(
      subtasks.map((st) =>
        st.id === subtaskId ? { ...st, status: newStatus } : st
      )
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        onSubtaskChange?.(); // Odśwież licznik w rodzicu
      } else {
        // Rollback on error
        loadSubtasks();
        toast.error("Nie udało się zaktualizować podzadania");
      }
    } catch (error) {
      console.error("Error toggling subtask:", error);
      loadSubtasks();
      toast.error("Wystąpił błąd");
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSubtasks(subtasks.filter((st) => st.id !== subtaskId));
        toast.success("Usunięto podzadanie");
        onSubtaskChange?.(); // Odśwież licznik w rodzicu
      } else {
        toast.error("Nie udało się usunąć podzadania");
      }
    } catch (error) {
      console.error("Error deleting subtask:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const completedCount = subtasks.filter((st) => st.status === TaskStatus.COMPLETED).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Ładowanie podzadań...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 pb-2 border-b">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      <div className="space-y-1">
        {subtasks.map((subtask) => {
          const isCompleted = subtask.status === TaskStatus.COMPLETED;
          return (
            <div
              key={subtask.id}
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors group",
                isCompleted && "opacity-60"
              )}
            >
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => handleToggleSubtask(subtask.id, !!checked)}
                className="h-4 w-4"
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {subtask.title}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {subtask.assignee && (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={subtask.assignee.avatar || undefined} />
                    <AvatarFallback
                      style={{ backgroundColor: subtask.assignee.color }}
                      className="text-white text-[10px]"
                    >
                      {subtask.assignee.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-red-500"
                  onClick={() => handleDeleteSubtask(subtask.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dodawanie podzadania */}
      {isAdding ? (
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Tytuł podzadania..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSubtask();
                } else if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewSubtaskTitle("");
                }
              }}
              className="flex-1 h-8"
              autoFocus
            />
            <Select value={newSubtaskAssignee} onValueChange={setNewSubtaskAssignee}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Osoba" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Brak</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddSubtask} size="sm" className="h-8">
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setIsAdding(false);
                setNewSubtaskTitle("");
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Enter = dodaj • Esc = anuluj</p>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-muted-foreground hover:text-foreground border-t pt-2 rounded-none"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3 w-3 mr-2" />
          Dodaj podzadanie
        </Button>
      )}
    </div>
  );
}

