"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Home, Users, Edit, Save, X, Shield } from "lucide-react";

interface HouseholdSettingsClientProps {
  household: {
    id: string;
    name: string;
    users: Array<{
      id: string;
      name: string | null;
      email: string | null;
      avatar: string | null;
      color: string;
      role: string;
    }>;
  };
  currentUserId: string;
  isAdmin: boolean;
}

export function HouseholdSettingsClient({ 
  household, 
  currentUserId,
  isAdmin 
}: HouseholdSettingsClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [householdName, setHouseholdName] = useState(household.name);

  const handleSave = async () => {
    if (!householdName.trim()) {
      toast.error("Nazwa gospodarstwa nie może być pusta");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/household", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: householdName.trim() }),
      });

      if (response.ok) {
        toast.success("Nazwa gospodarstwa została zaktualizowana");
        setIsEditing(false);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || "Nie udało się zaktualizować");
      }
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN": return "Administrator";
      case "MEMBER": return "Członek";
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === "ADMIN" ? "default" : "secondary";
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ustawienia gospodarstwa</h1>
        <p className="text-muted-foreground">Zarządzaj swoim gospodarstwem domowym</p>
      </div>

      {/* Nazwa gospodarstwa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Nazwa gospodarstwa
          </CardTitle>
          <CardDescription>
            Nazwa widoczna dla wszystkich członków rodziny
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="householdName">Nowa nazwa</Label>
                <Input
                  id="householdName"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="np. Rodzina Kowalskich"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Zapisywanie..." : "Zapisz"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setHouseholdName(household.name);
                  }}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Anuluj
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold">{household.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ID: {household.id}
                </p>
              </div>
              {isAdmin && (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Zmień nazwę
                </Button>
              )}
            </div>
          )}
          {!isAdmin && (
            <p className="text-sm text-muted-foreground mt-4">
              💡 Tylko administrator może zmieniać nazwę gospodarstwa
            </p>
          )}
        </CardContent>
      </Card>

      {/* Członkowie gospodarstwa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Członkowie gospodarstwa
          </CardTitle>
          <CardDescription>
            {household.users.length} {household.users.length === 1 ? "osoba" : "osób"} w gospodarstwie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {household.users.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback style={{ backgroundColor: user.color }}>
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {user.name}
                      {user.id === currentUserId && (
                        <span className="text-xs text-muted-foreground">(Ty)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role === "ADMIN" && <Shield className="h-3 w-3 mr-1" />}
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statystyki */}
      <Card>
        <CardHeader>
          <CardTitle>Statystyki gospodarstwa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{household.users.length}</p>
                <p className="text-sm text-muted-foreground">Członków</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {household.users.filter(u => u.role === "ADMIN").length}
                </p>
                <p className="text-sm text-muted-foreground">Administratorów</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
