"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Plus,
  Trash2,
  Edit,
  User,
  Mountain,
  Waves,
  Briefcase,
  Baby,
  Tent,
  X,
  ListPlus,
  Car,
  UserCog,
  Wallet, DollarSign, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trip, TripParticipant, TripChecklist, TripChecklistItem, TripStatus } from "@prisma/client";
import { TripPlaces } from "@/components/trips/TripPlaces";
import { TripBudget } from "@/components/trips/TripBudget";
import { TripDocuments } from "@/components/trips/TripDocuments";
import { TripItinerary } from "@/components/trips/TripItinerary";
import { TripInfo } from "@/components/trips/TripInfo";
import { StatCard } from "@/components/trips/StatCard";
import { WeatherWidget } from "@/components/trips/WeatherWidget";
import { TripCarPooling } from "@/components/trips/TripCarPooling";
import { TripMealPlanning } from "@/components/trips/TripMealPlanning";
import { TripBudgetAlerts } from "@/components/trips/TripBudgetAlerts";
import { getSmartSuggestions } from "@/lib/packing-templates";

interface TripPlace {
  id: string;
  tripId?: string;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isVisited: boolean;
  visitOrder: number | null;
  visitDate: Date | null;
  visitNotes: string | null;
  websiteUrl: string | null;
  phoneNumber: string | null;
  openingHours: string | null;
  estimatedDuration: number | null;
  estimatedCost: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TripExpense {
  id: string;
  tripId?: string;
  name: string;
  amount: number;
  category: string | null;
  paidById: string | null;
  date: Date;
  notes: string | null;
  createdAt?: Date;
}

interface TripDocument {
  id: string;
  tripId?: string;
  name: string;
  type: string;
  url: string | null;
  fileUrl: string | null;
  notes: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
}

type TripWithRelations = Trip & {
  participants: (TripParticipant & {
    user: {
      id: string;
      name: string | null;
      email?: string;
      avatar: string | null;
      color: string;
    };
  })[];
  checklists: (TripChecklist & {
    items: TripChecklistItem[];
  })[];
  places?: TripPlace[];
  expenses?: TripExpense[];
  documents?: TripDocument[];
  plannedBudget?: number | null;
  foodBudget?: number | null;
};

type Member = {
  id: string;
  name: string | null;
  email?: string;
  avatar: string | null;
  color: string;
};

interface TripDetailClientProps {
  trip: TripWithRelations;
  members: Member[];
  currentUserId: string;
}

const statusConfig: Record<TripStatus, { label: string; color: string }> = {
  PLANNED: { label: "Zaplanowany", color: "bg-blue-500" },
  IN_PROGRESS: { label: "W trakcie", color: "bg-green-500" },
  COMPLETED: { label: "Zakończony", color: "bg-gray-500" },
  CANCELLED: { label: "Anulowany", color: "bg-red-500" },
};

const checklistTemplates = [
  {
    id: "beach",
    name: "Wyjazd nad morze",
    icon: Waves,
    items: ["Ręczniki plażowe", "Krem z filtrem SPF", "Okulary przeciwsłoneczne", "Kapelusz/czapka", "Strój kąpielowy", "Klapki plażowe"],
  },
  {
    id: "mountains",
    name: "Wyjazd w góry",
    icon: Mountain,
    items: ["Buty trekkingowe", "Kurtka przeciwdeszczowa", "Kijki trekkingowe", "Plecak turystyczny", "Mapa/GPS", "Apteczka"],
  },
  {
    id: "business",
    name: "Wyjazd służbowy",
    icon: Briefcase,
    items: ["Laptop i ładowarka", "Dokumenty firmowe", "Wizytówki", "Eleganckie ubranie", "Notatnik", "Powerbank"],
  },
  {
    id: "camping",
    name: "Kemping",
    icon: Tent,
    items: ["Namiot", "Śpiwór", "Karimata/materac", "Latarka", "Kuchenka turystyczna", "Nóż wielofunkcyjny"],
  },
  {
    id: "kids",
    name: "Z dziećmi",
    icon: Baby,
    items: ["Pieluchy/chusteczki", "Jedzenie dla dziecka", "Ulubione zabawki", "Ubrania na zmianę", "Leki dla dziecka", "Fotelik samochodowy"],
  },
];

export function TripDetailClient({ trip, members, currentUserId }: TripDetailClientProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [checklists, setChecklists] = useState(trip.checklists);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [showNewChecklistDialog, setShowNewChecklistDialog] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [participants, setParticipants] = useState(trip.participants);
  const [places, setPlaces] = useState<TripPlace[]>(trip.places || []);
  const [expenses, setExpenses] = useState<TripExpense[]>(trip.expenses || []);
  const [documents, setDocuments] = useState<TripDocument[]>(trip.documents || []);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [editForm, setEditForm] = useState({
    name: trip.name,
    destination: trip.destination || "",
    description: trip.description || "",
    startDate: format(new Date(trip.startDate), "yyyy-MM-dd"),
    endDate: format(new Date(trip.endDate), "yyyy-MM-dd"),
  });

  const availableRoles = [
    { value: "organizator", label: "Organizator", icon: UserCog },
    { value: "kierowca", label: "Kierowca", icon: Car },
    { value: "skarbnik", label: "Skarbnik", icon: Wallet },
    { value: null, label: "Brak roli", icon: User },
  ];

  // Poprawne obliczanie dni do wyjazdu
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(trip.startDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(trip.endDate);
  endDate.setHours(0, 0, 0, 0);

  const daysUntil = differenceInDays(startDate, today);
  const daysFromEnd = differenceInDays(today, endDate);
  const tripDuration = differenceInDays(endDate, startDate) + 1;

  // Dynamiczne obliczanie statusu na podstawie dat
  const getCurrentStatus = () => {
    if (trip.status === "CANCELLED") {
      return statusConfig.CANCELLED;
    }

    if (daysFromEnd > 0) {
      // Wyjazd się skończył
      return statusConfig.COMPLETED;
    }

    if (daysUntil <= 0 && daysFromEnd <= 0) {
      // Wyjazd trwa
      return statusConfig.IN_PROGRESS;
    }

    // Wyjazd zaplanowany w przyszłości
    return statusConfig.PLANNED;
  };

  const status = getCurrentStatus();

  // Oblicz tekst "Do wyjazdu"
  const getDaysUntilText = () => {
    if (trip.status === "CANCELLED") {
      return "Anulowany";
    }

    if (daysFromEnd > 0) {
      return "Zakończony";
    }

    if (daysUntil <= 0 && daysFromEnd <= 0) {
      // Wyjazd trwa
      const daysLeft = differenceInDays(endDate, today);
      return `W trakcie (${daysLeft} dni)`;
    }

    if (daysUntil === 0) {
      return "Dziś!";
    }

    return `${daysUntil} dni`;
  };

  // Quick Stats - obliczenia
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetProgress = trip.plannedBudget
    ? Math.round((totalSpent / trip.plannedBudget) * 100)
    : 0;

  const visitedPlaces = places.filter(p => p.isVisited).length;
  const totalPlaces = places.length;

  const packedItems = checklists.reduce((sum, cl) =>
    sum + cl.items.filter(i => i.isPacked).length, 0
  );
  const totalChecklistItems = checklists.reduce((sum, cl) =>
    sum + cl.items.length, 0
  );
  const packedPercent = totalChecklistItems > 0
    ? Math.round((packedItems / totalChecklistItems) * 100)
    : 0;

  // Smart packing suggestions
  const smartSuggestions = trip.destination
    ? getSmartSuggestions(trip.destination, new Date(trip.startDate), new Date(trip.endDate))
    : [];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Wyjazd został usunięty");
        router.push("/trips");
      } else {
        toast.error("Nie udało się usunąć wyjazdu");
      }
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleToggleItem = async (checklistId: string, itemId: string, isPacked: boolean) => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/checklists/${checklistId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPacked }),
      });
      if (response.ok) {
        setChecklists(checklists.map(cl =>
          cl.id === checklistId
            ? { ...cl, items: cl.items.map(item => item.id === itemId ? { ...item, isPacked } : item) }
            : cl
        ));
      }
    } catch {
      toast.error("Nie udało się zaktualizować");
    }
  };

  const handleAddItem = async (checklistId: string) => {
    const name = newItemInputs[checklistId]?.trim();
    if (!name) return;

    try {
      const response = await fetch(`/api/trips/${trip.id}/checklists/${checklistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        const newItem = await response.json();
        setChecklists(checklists.map(cl =>
          cl.id === checklistId ? { ...cl, items: [...cl.items, newItem] } : cl
        ));
        setNewItemInputs({ ...newItemInputs, [checklistId]: "" });
      }
    } catch {
      toast.error("Nie udało się dodać rzeczy");
    }
  };

  const handleDeleteItem = async (checklistId: string, itemId: string) => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/checklists/${checklistId}/items/${itemId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setChecklists(checklists.map(cl =>
          cl.id === checklistId ? { ...cl, items: cl.items.filter(i => i.id !== itemId) } : cl
        ));
      }
    } catch {
      toast.error("Nie udało się usunąć");
    }
  };

  const handleCreateChecklist = async (name: string, items: string[] = []) => {
    setIsCreatingChecklist(true);
    try {
      const response = await fetch(`/api/trips/${trip.id}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, items }),
      });
      if (response.ok) {
        const newChecklist = await response.json();
        setChecklists([...checklists, newChecklist]);
        setShowNewChecklistDialog(false);
        setNewChecklistName("");
        toast.success("Lista pakowania została utworzona");
      } else {
        toast.error("Nie udało się utworzyć listy");
      }
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setIsCreatingChecklist(false);
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    const template = checklistTemplates.find(t => t.id === templateId);
    if (!template) return;
    await handleCreateChecklist(template.name, template.items);
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/checklists/${checklistId}`, { method: "DELETE" });
      if (response.ok) {
        setChecklists(checklists.filter(cl => cl.id !== checklistId));
        toast.success("Lista została usunięta");
      }
    } catch {
      toast.error("Nie udało się usunąć listy");
    }
  };

  const handleUpdateRole = async (participantId: string, role: string | null) => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (response.ok) {
        setParticipants(participants.map(p =>
          p.id === participantId ? { ...p, role } : p
        ));
        toast.success("Rola została zaktualizowana");
      }
    } catch {
      toast.error("Nie udało się zaktualizować roli");
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedMemberId) {
      toast.error("Wybierz uczestnika");
      return;
    }

    // Sprawdź czy uczestnik już nie jest dodany
    if (participants.some(p => p.user.id === selectedMemberId)) {
      toast.error("Ten użytkownik już jest uczestnikiem");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${trip.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedMemberId }),
      });

      if (response.ok) {
        const newParticipant = await response.json();
        setParticipants([...participants, newParticipant]);
        setShowAddParticipantDialog(false);
        setSelectedMemberId("");
        toast.success("Uczestnik został dodany");
      } else {
        toast.error("Nie udało się dodać uczestnika");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const handleEdit = async () => {
    if (!editForm.name || !editForm.startDate || !editForm.endDate) {
      toast.error("Wypełnij wymagane pola");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          destination: editForm.destination,
          description: editForm.description,
          startDate: new Date(editForm.startDate).toISOString(),
          endDate: new Date(editForm.endDate).toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Wyjazd został zaktualizowany");
        setShowEditDialog(false);
        // Odśwież stronę aby zobaczyć zmiany
        window.location.reload();
      } else {
        toast.error("Nie udało się zaktualizować wyjazdu");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/trips">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{trip.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{trip.destination || "Brak miejsca"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={status.color}>{status.label}</Badge>
          <Button variant="outline" size="icon" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Wydano"
          value={`${totalSpent.toFixed(0)} zł`}
          subtext={trip.plannedBudget ? `${budgetProgress}% budżetu` : "Brak limitu"}
          color="text-green-600"
        />
        <StatCard
          icon={MapPin}
          label="Miejsca"
          value={`${visitedPlaces}/${totalPlaces}`}
          subtext={totalPlaces > 0 ? `${Math.round((visitedPlaces/totalPlaces)*100)}% odwiedzonych` : "Brak miejsc"}
          color="text-blue-600"
        />
        <StatCard
          icon={CheckSquare}
          label="Spakowano"
          value={`${packedItems}/${totalChecklistItems}`}
          subtext={`${packedPercent}%`}
          color="text-purple-600"
        />
        <StatCard
          icon={Calendar}
          label="Dni"
          value={tripDuration}
          subtext={getDaysUntilText()}
          color="text-orange-600"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Przegląd</TabsTrigger>
          <TabsTrigger value="itinerary">Plan</TabsTrigger>
          <TabsTrigger value="meals" className="gap-2">
            Posiłki
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              NOWE
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="transport" className="gap-2">
            Transport
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              NOWE
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="info">Informacje</TabsTrigger>
          <TabsTrigger value="checklist">Listy pakowania</TabsTrigger>
          <TabsTrigger value="places">Miejsca</TabsTrigger>
          <TabsTrigger value="documents">Dokumenty</TabsTrigger>
          <TabsTrigger value="budget">Budżet</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Weather Widget */}
          {trip.destination && (
            <WeatherWidget
              destination={trip.destination}
              startDate={new Date(trip.startDate)}
              endDate={new Date(trip.endDate)}
            />
          )}

          {/* Smart Packing Suggestions */}
          {smartSuggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">💡 Inteligentne sugestie</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {smartSuggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {trip.description && (
            <Card>
              <CardHeader>
                <CardTitle>Opis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{trip.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Uczestnicy
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowAddParticipantDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={participant.user.avatar || undefined} />
                        <AvatarFallback style={{ backgroundColor: participant.user.color }}>
                          {participant.user.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{participant.user.name}</p>
                        <p className="text-sm text-muted-foreground">{participant.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge variant="outline" className="cursor-pointer">
                            {participant.role || "Uczestnik"}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Zmień rolę</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {availableRoles.map((role) => (
                            <DropdownMenuItem
                              key={role.value || "none"}
                              onClick={() => handleUpdateRole(participant.id, role.value)}
                            >
                              <role.icon className="h-4 w-4 mr-2" />
                              {role.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/trips/${trip.id}/participants/${participant.id}`, {
                                  method: "DELETE",
                                });
                                if (response.ok) {
                                  setParticipants(participants.filter(p => p.id !== participant.id));
                                  toast.success("Uczestnik został usunięty");
                                }
                              } catch {
                                toast.error("Nie udało się usunąć uczestnika");
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Usuń z wyjazdu
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Itinerary Tab */}
        <TabsContent value="itinerary">
          <TripItinerary tripId={trip.id} startDate={trip.startDate} endDate={trip.endDate} />
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info">
          <TripInfo trip={trip} />
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Listy pakowania</h3>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <ListPlus className="h-4 w-4 mr-2" />
                    Z szablonu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {checklistTemplates.map((template) => (
                    <DropdownMenuItem key={template.id} onClick={() => handleCreateFromTemplate(template.id)}>
                      <template.icon className="h-4 w-4 mr-2" />
                      {template.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setShowNewChecklistDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nowa lista
              </Button>
            </div>
          </div>

          {checklists.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak list pakowania. Dodaj pierwszą listę!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {checklists.map((checklist) => {
                const completedItems = checklist.items.filter(i => i.isPacked).length;
                const totalItems = checklist.items.length;
                const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                return (
                  <Card key={checklist.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{checklist.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{completedItems}/{totalItems}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDeleteChecklist(checklist.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {checklist.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <Checkbox
                            checked={item.isPacked}
                            onCheckedChange={(checked) => handleToggleItem(checklist.id, item.id, !!checked)}
                          />
                          <span className={item.isPacked ? "line-through text-muted-foreground" : ""}>
                            {item.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteItem(checklist.id, item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleAddItem(checklist.id); }}
                        className="flex gap-2 mt-2"
                      >
                        <Input
                          placeholder="Dodaj rzecz..."
                          value={newItemInputs[checklist.id] || ""}
                          onChange={(e) => setNewItemInputs({ ...newItemInputs, [checklist.id]: e.target.value })}
                          className="flex-1"
                        />
                        <Button type="submit" size="icon" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Places Tab */}
        <TabsContent value="places">
          <TripPlaces tripId={trip.id} places={places} onPlacesChange={setPlaces} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <TripDocuments tripId={trip.id} documents={documents} onDocumentsChange={setDocuments} />
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget">
          <div className="space-y-4">
            <TripBudgetAlerts tripId={trip.id} plannedBudget={trip.plannedBudget} />
            <TripBudget
              tripId={trip.id}
              expenses={expenses}
              members={participants.map(p => ({ id: p.user.id, name: p.user.name, color: p.user.color }))}
              plannedBudget={trip.plannedBudget || null}
              onExpensesChange={setExpenses}
              onBudgetChange={() => {}}
            />
          </div>
        </TabsContent>

        {/* Meals Tab */}
        <TabsContent value="meals">
          <TripMealPlanning
            tripId={trip.id}
            tripStartDate={new Date(trip.startDate)}
            tripEndDate={new Date(trip.endDate)}
            members={participants.map(p => ({
              id: p.user.id,
              name: p.user.name,
              avatar: p.user.avatar,
              color: p.user.color
            }))}
            currentUserId={currentUserId}
            foodBudget={trip.foodBudget}
          />
        </TabsContent>

        {/* Transport Tab */}
        <TabsContent value="transport">
          <TripCarPooling
            tripId={trip.id}
            members={participants.map(p => ({
              id: p.user.id,
              name: p.user.name,
              avatar: p.user.avatar,
              color: p.user.color
            }))}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć wyjazd?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć &quot;{trip.name}&quot;? Ta operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-500">
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Checklist Dialog */}
      <Dialog open={showNewChecklistDialog} onOpenChange={setShowNewChecklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowa lista pakowania</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nazwa listy</Label>
              <Input
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
                placeholder="np. Ubrania, Elektronika..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChecklistDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={() => handleCreateChecklist(newChecklistName)}
              disabled={!newChecklistName.trim() || isCreatingChecklist}
            >
              {isCreatingChecklist ? "Tworzenie..." : "Utwórz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trip Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edytuj wyjazd</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nazwa wyjazdu</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="np. Wakacje nad morzem"
              />
            </div>

            <div className="space-y-2">
              <Label>Miejsce docelowe</Label>
              <Input
                value={editForm.destination}
                onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                placeholder="np. Sopot"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data rozpoczęcia</Label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data zakończenia</Label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opis (opcjonalnie)</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Dodatkowe informacje o wyjeździe..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleEdit}>
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Participant Dialog */}
      <Dialog open={showAddParticipantDialog} onOpenChange={setShowAddParticipantDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Dodaj uczestnika</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Wybierz członka rodziny</Label>
              <div className="space-y-2">
                {members.filter(m => !participants.some(p => p.user.id === m.id)).map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMemberId === member.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedMemberId(member.id)}
                  >
                    <Avatar>
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback style={{ backgroundColor: member.color }}>
                        {member.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                ))}
                {members.filter(m => !participants.some(p => p.user.id === m.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Wszyscy członkowie rodziny są już uczestnikami
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddParticipantDialog(false);
              setSelectedMemberId("");
            }}>
              Anuluj
            </Button>
            <Button
              onClick={handleAddParticipant}
              disabled={!selectedMemberId}
            >
              Dodaj uczestnika
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

