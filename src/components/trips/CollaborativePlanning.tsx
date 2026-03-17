"use client";

import { useState } from "react";
import { Plus, Vote, CheckSquare, User, Calendar, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface TripVote {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  createdBy: string;
  createdByName: string;
  options: TripVoteOption[];
  createdAt: Date;
  expiresAt: Date | null;
}

interface TripVoteOption {
  id: string;
  option: string;
  description: string | null;
  votedBy: string[];
}

interface TripTask {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  status: string;
  dueDate: Date | null;
  createdBy: string;
  createdAt: Date;
}

interface Member {
  id: string;
  name: string | null;
}

interface CollaborativePlanningProps {
  tripId: string;
  votes: TripVote[];
  tasks: TripTask[];
  members: Member[];
  currentUserId: string;
  onVotesChange: (votes: TripVote[]) => void;
  onTasksChange: (tasks: TripTask[]) => void;
}

export function CollaborativePlanning({
  tripId,
  votes,
  tasks,
  members,
  currentUserId,
  onVotesChange,
  onTasksChange,
}: CollaborativePlanningProps) {
  const [activeTab, setActiveTab] = useState<'votes' | 'tasks'>('votes');
  const [showNewVoteDialog, setShowNewVoteDialog] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newVote, setNewVote] = useState({
    title: "",
    description: "",
    type: "POLL",
    options: ["", ""],
  });
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
  });

  const handleAddVoteOption = () => {
    setNewVote({ ...newVote, options: [...newVote.options, ""] });
  };

  const handleRemoveVoteOption = (index: number) => {
    setNewVote({ ...newVote, options: newVote.options.filter((_, i) => i !== index) });
  };

  const handleCreateVote = async () => {
    if (!newVote.title.trim() || newVote.options.filter(o => o.trim()).length < 2) {
      toast.error("Podaj tytuł i co najmniej 2 opcje");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newVote,
          options: newVote.options.filter(o => o.trim()),
        }),
      });

      if (response.ok) {
        const vote = await response.json();
        onVotesChange([vote, ...votes]);
        setShowNewVoteDialog(false);
        setNewVote({ title: "", description: "", type: "POLL", options: ["", ""] });
        toast.success("Głosowanie utworzone");
      } else {
        toast.error("Nie udało się utworzyć głosowania");
      }
    } catch (error) {
      console.error('Create vote error:', error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleVote = async (voteId: string, optionId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/votes/${voteId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      });

      if (response.ok) {
        const updatedVote = await response.json();
        onVotesChange(votes.map(v => v.id === voteId ? updatedVote : v));
        toast.success("Głos oddany");
      }
    } catch (error) {
      console.error('Vote error:', error);
      toast.error("Nie udało się oddać głosu");
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Podaj tytuł zadania");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          assignedTo: newTask.assignedTo || null,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        }),
      });

      if (response.ok) {
        const task = await response.json();
        onTasksChange([task, ...tasks]);
        setShowNewTaskDialog(false);
        setNewTask({ title: "", description: "", assignedTo: "", dueDate: "" });
        toast.success("Zadanie utworzone");
      } else {
        toast.error("Nie udało się utworzyć zadania");
      }
    } catch (error) {
      console.error('Create task error:', error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        onTasksChange(tasks.map(t => t.id === taskId ? updatedTask : t));
        toast.success("Status zaktualizowany");
      }
    } catch (error) {
      console.error('Update task error:', error);
      toast.error("Nie udało się zaktualizować");
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'votes' | 'tasks')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="votes">
          <Vote className="h-4 w-4 mr-2" />
          Głosowania ({votes.filter(v => v.status === 'ACTIVE').length})
        </TabsTrigger>
        <TabsTrigger value="tasks">
          <CheckSquare className="h-4 w-4 mr-2" />
          Zadania ({tasks.filter(t => t.status !== 'COMPLETED').length})
        </TabsTrigger>
      </TabsList>

      {/* Votes Tab */}
      <TabsContent value="votes" className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowNewVoteDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nowe głosowanie
          </Button>
        </div>

        {votes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Vote className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Brak głosowań</p>
              <p className="text-sm mt-1">Utwórz pierwsze głosowanie!</p>
            </CardContent>
          </Card>
        ) : (
          votes.map((vote) => {
            const totalVotes = vote.options.reduce((sum, opt) => sum + opt.votedBy.length, 0);
            const userVoted = vote.options.some(opt => opt.votedBy.includes(currentUserId));

            return (
              <Card key={vote.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{vote.title}</CardTitle>
                      {vote.description && (
                        <p className="text-sm text-muted-foreground mt-1">{vote.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Utworzone przez {vote.createdByName}</span>
                        <span>•</span>
                        <span>{format(new Date(vote.createdAt), 'd MMM', { locale: pl })}</span>
                      </div>
                    </div>
                    <Badge variant={vote.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {vote.status === 'ACTIVE' ? 'Aktywne' : 'Zamknięte'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vote.options.map((option) => {
                    const voteCount = option.votedBy.length;
                    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                    const userVotedThis = option.votedBy.includes(currentUserId);

                    return (
                      <div key={option.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Button
                              variant={userVotedThis ? "default" : "outline"}
                              className="w-full justify-start"
                              onClick={() => handleVote(vote.id, option.id)}
                              disabled={vote.status !== 'ACTIVE'}
                            >
                              {userVotedThis && <ThumbsUp className="h-4 w-4 mr-2" />}
                              {option.option}
                            </Button>
                          </div>
                          <span className="ml-4 text-sm font-medium">
                            {voteCount} {voteCount === 1 ? 'głos' : 'głosy'}
                          </span>
                        </div>
                        {totalVotes > 0 && (
                          <Progress value={percentage} className="h-2" />
                        )}
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground mt-4">
                    Łącznie głosów: {totalVotes}
                    {userVoted && " • Już głosowałeś"}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </TabsContent>

      {/* Tasks Tab */}
      <TabsContent value="tasks" className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowNewTaskDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nowe zadanie
          </Button>
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Brak zadań</p>
              <p className="text-sm mt-1">Utwórz pierwsze zadanie!</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{task.title}</h4>
                      <Badge variant={
                        task.status === 'COMPLETED' ? 'default' :
                        task.status === 'IN_PROGRESS' ? 'secondary' : 'outline'
                      }>
                        {task.status === 'TODO' ? 'Do zrobienia' :
                         task.status === 'IN_PROGRESS' ? 'W trakcie' : 'Gotowe'}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {task.assignedToName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignedToName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.dueDate), 'd MMM', { locale: pl })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Select
                    value={task.status}
                    onValueChange={(status) => handleUpdateTaskStatus(task.id, status)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">Do zrobienia</SelectItem>
                      <SelectItem value="IN_PROGRESS">W trakcie</SelectItem>
                      <SelectItem value="COMPLETED">Gotowe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* New Vote Dialog */}
      <Dialog open={showNewVoteDialog} onOpenChange={setShowNewVoteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nowe głosowanie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tytuł *</Label>
              <Input
                placeholder="np. Gdzie zjeść obiad?"
                value={newVote.title}
                onChange={(e) => setNewVote({ ...newVote, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Opis (opcjonalnie)</Label>
              <Textarea
                placeholder="Dodatkowe informacje..."
                value={newVote.description}
                onChange={(e) => setNewVote({ ...newVote, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Opcje do wyboru *</Label>
              {newVote.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Opcja ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...newVote.options];
                      newOptions[index] = e.target.value;
                      setNewVote({ ...newVote, options: newOptions });
                    }}
                  />
                  {newVote.options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveVoteOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddVoteOption}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj opcję
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewVoteDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreateVote}>Utwórz głosowanie</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowe zadanie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tytuł *</Label>
              <Input
                placeholder="np. Zarezerwuj hotel"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Opis (opcjonalnie)</Label>
              <Textarea
                placeholder="Szczegóły zadania..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Przypisz do</Label>
                <Select
                  value={newTask.assignedTo}
                  onValueChange={(v) => setNewTask({ ...newTask, assignedTo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz osobę" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Termin</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreateTask}>Utwórz zadanie</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
