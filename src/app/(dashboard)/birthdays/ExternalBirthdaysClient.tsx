"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInYears } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Cake,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ExternalBirthdayFormDialog } from "@/components/birthdays/ExternalBirthdayFormDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ExternalBirthday {
  id: string;
  name: string;
  birthDate: Date;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  color: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface HouseholdMember {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  color: string;
  birthDate: Date | null;
  nameDay: string | null;
}

interface ExternalBirthdaysClientProps {
  externalBirthdays: ExternalBirthday[];
  householdMembers: HouseholdMember[];
}

export function ExternalBirthdaysClient({
  externalBirthdays,
  householdMembers,
}: ExternalBirthdaysClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("external");

  const filteredBirthdays = externalBirthdays.filter((birthday) =>
    birthday.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMembers = householdMembers.filter((member) =>
    (member.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/external-birthdays/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast.success("Urodziny usunięte");
      router.refresh();
    } catch (error) {
      console.error("Error deleting external birthday:", error);
      toast.error("Nie udało się usunąć");
    } finally {
      setDeleteId(null);
    }
  };

  const getAge = (birthDate: Date) => {
    return differenceInYears(new Date(), new Date(birthDate));
  };

  const getNextBirthday = (birthDate: Date) => {
    const today = new Date();
    const thisYear = today.getFullYear();
    const birth = new Date(birthDate);

    let nextBirthday = new Date(thisYear, birth.getMonth(), birth.getDate());

    if (nextBirthday < today) {
      nextBirthday = new Date(thisYear + 1, birth.getMonth(), birth.getDate());
    }

    const daysUntil = Math.ceil(
      (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { date: nextBirthday, daysUntil };
  };

  const getNextNameDay = (nameDay: string | null) => {
    // nameDay w formacie "DD-MM" np. "12-03" dla 12 marca
    if (!nameDay) {
      return { date: new Date(), daysUntil: 999 }; // Fallback
    }

    const today = new Date();
    const thisYear = today.getFullYear();

    // Walidacja formatu
    const parts = nameDay.split("-");
    if (parts.length !== 2) {
      return { date: new Date(), daysUntil: 999 }; // Fallback
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    // Walidacja wartości
    if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
      return { date: new Date(), daysUntil: 999 }; // Fallback
    }

    let nextNameDay = new Date(thisYear, month - 1, day);

    // Sprawdź czy data jest poprawna (np. 31 lutego będzie invalid)
    if (isNaN(nextNameDay.getTime())) {
      return { date: new Date(), daysUntil: 999 }; // Fallback
    }

    if (nextNameDay < today) {
      nextNameDay = new Date(thisYear + 1, month - 1, day);
    }

    const daysUntil = Math.ceil(
      (nextNameDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { date: nextNameDay, daysUntil };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Cake className="h-8 w-8" />
            Urodziny i Imieniny
          </h1>
          <p className="text-muted-foreground">
            Zarządzaj urodzinami i imieninami członków gospodarstwa oraz znajomych
          </p>
        </div>
        <ExternalBirthdayFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj urodziny
            </Button>
          }
          onSuccess={() => router.refresh()}
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Cake className="h-4 w-4" />
            Znajomi ({externalBirthdays.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Członkowie ({householdMembers.filter(m => m.birthDate).length})
          </TabsTrigger>
          <TabsTrigger value="namedays" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Imieniny ({householdMembers.filter(m => m.nameDay).length})
          </TabsTrigger>
        </TabsList>

        {/* External Birthdays Tab */}
        <TabsContent value="external" className="space-y-4">
          {filteredBirthdays.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Cake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">
                    {searchQuery
                      ? "Nie znaleziono urodzin"
                      : "Brak dodanych urodzin"}
                  </p>
                  <p className="text-sm mb-4">
                    {searchQuery
                      ? "Spróbuj wyszukać inną frazę"
                      : "Dodaj urodziny krewnych, przyjaciół lub innych ważnych osób"}
                  </p>
                  {!searchQuery && (
                    <ExternalBirthdayFormDialog
                      trigger={
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Dodaj pierwsze urodziny
                        </Button>
                      }
                      onSuccess={() => router.refresh()}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBirthdays.map((birthday) => {
                const age = getAge(birthday.birthDate);
                const { date: nextBirthday, daysUntil } = getNextBirthday(
                  birthday.birthDate
                );
                const isToday = daysUntil === 0;
                const isTomorrow = daysUntil === 1;
                const isThisWeek = daysUntil <= 7;

            return (
              <Card
                key={birthday.id}
                className="hover:shadow-md transition-shadow"
                style={{
                  borderLeft: `4px solid ${birthday.color}`,
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar
                        className="h-12 w-12"
                        style={{ backgroundColor: birthday.color }}
                      >
                        <AvatarFallback className="text-white text-lg">
                          {birthday.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {birthday.name}
                        </h3>
                        {birthday.relationship && (
                          <p className="text-sm text-muted-foreground">
                            {birthday.relationship}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ExternalBirthdayFormDialog
                          externalBirthday={birthday}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edytuj
                            </DropdownMenuItem>
                          }
                          onSuccess={() => router.refresh()}
                        />
                        <DropdownMenuItem
                          className="text-red-600"
                          onSelect={() => setDeleteId(birthday.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Wiek i data urodzin */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(birthday.birthDate), "d MMMM yyyy", {
                          locale: pl,
                        })}
                      </span>
                    </div>
                    <Badge variant="secondary">{age} lat</Badge>
                  </div>

                  {/* Następne urodziny */}
                  <div className="p-2 rounded-lg bg-accent/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Następne urodziny:
                      </span>
                      {isToday ? (
                        <Badge className="bg-pink-500">🎂 Dziś!</Badge>
                      ) : isTomorrow ? (
                        <Badge variant="secondary">Jutro</Badge>
                      ) : isThisWeek ? (
                        <Badge variant="outline">Za {daysUntil} dni</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {format(nextBirthday, "d MMMM", { locale: pl })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kontakt */}
                  {(birthday.phone || birthday.email) && (
                    <div className="space-y-1 pt-2 border-t">
                      {birthday.phone && (
                        <a
                          href={`tel:${birthday.phone}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {birthday.phone}
                        </a>
                      )}
                      {birthday.email && (
                        <a
                          href={`mailto:${birthday.email}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {birthday.email}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Notatki */}
                  {birthday.notes && (
                    <p className="text-xs text-muted-foreground pt-2 border-t line-clamp-2">
                      {birthday.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </TabsContent>

        {/* Household Members Birthdays Tab */}
        <TabsContent value="members" className="space-y-4">
          {filteredMembers.filter(m => m.birthDate).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">Brak urodzin członków</p>
                  <p className="text-sm">
                    Członkowie mogą dodać datę urodzenia w swoim profilu
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers
                .filter(m => m.birthDate)
                .map((member) => {
                  const age = getAge(member.birthDate!);
                  const { date: nextBirthday, daysUntil } = getNextBirthday(member.birthDate!);
                  const isToday = daysUntil === 0;
                  const isTomorrow = daysUntil === 1;
                  const isThisWeek = daysUntil <= 7;

                  return (
                    <Card
                      key={member.id}
                      className="hover:shadow-md transition-shadow"
                      style={{ borderLeft: `4px solid ${member.color}` }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback style={{ backgroundColor: member.color }}>
                              <span className="text-white text-lg">
                                {(member.name || member.email)
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </span>
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">
                              {member.name || member.email}
                            </h3>
                            <p className="text-sm text-muted-foreground">Członek gospodarstwa</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(member.birthDate!, "d MMMM yyyy", { locale: pl })}
                            </span>
                          </div>
                          <Badge variant="secondary">{age} lat</Badge>
                        </div>

                        <div className="p-2 rounded-lg bg-accent/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Następne urodziny:</span>
                            {isToday ? (
                              <Badge className="bg-pink-500">🎂 Dziś!</Badge>
                            ) : isTomorrow ? (
                              <Badge variant="secondary">Jutro</Badge>
                            ) : isThisWeek ? (
                              <Badge variant="outline">Za {daysUntil} dni</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {format(nextBirthday, "d MMMM", { locale: pl })}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* Name Days Tab */}
        <TabsContent value="namedays" className="space-y-4">
          {filteredMembers.filter(m => m.nameDay).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">Brak imienin</p>
                  <p className="text-sm">
                    Członkowie mogą dodać datę imienin w swoim profilu
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers
                .filter(m => m.nameDay)
                .map((member) => {
                  const { date: nextNameDay, daysUntil } = getNextNameDay(member.nameDay!);
                  const isToday = daysUntil === 0;
                  const isTomorrow = daysUntil === 1;
                  const isThisWeek = daysUntil <= 7;

                  return (
                    <Card
                      key={member.id}
                      className="hover:shadow-md transition-shadow"
                      style={{ borderLeft: `4px solid ${member.color}` }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback style={{ backgroundColor: member.color }}>
                              <span className="text-white text-lg">
                                {(member.name || member.email)
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </span>
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">
                              {member.name || member.email}
                            </h3>
                            <p className="text-sm text-muted-foreground">Imieniny</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Sparkles className="h-4 w-4" />
                          <span>
                            {!isNaN(nextNameDay.getTime())
                              ? format(nextNameDay, "d MMMM", { locale: pl })
                              : 'Nieprawidłowa data'
                            }
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-accent/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Następne imieniny:</span>
                            {daysUntil === 999 ? (
                              <Badge variant="secondary">Brak daty</Badge>
                            ) : isToday ? (
                              <Badge className="bg-purple-500">✨ Dziś!</Badge>
                            ) : isTomorrow ? (
                              <Badge variant="secondary">Jutro</Badge>
                            ) : isThisWeek ? (
                              <Badge variant="outline">Za {daysUntil} dni</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {!isNaN(nextNameDay.getTime())
                                  ? format(nextNameDay, "d MMMM", { locale: pl })
                                  : 'Brak daty'
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog usuwania */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Urodziny zostaną trwale usunięte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

