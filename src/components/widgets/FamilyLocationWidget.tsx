"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FamilyMember {
  id: string;
  name: string | null;
  color: string;
  latitude: number;
  longitude: number;
  lastUpdate: Date;
}

export function FamilyLocationWidget() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/family/location");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.users);
      }
    } catch (error) {
      console.error("Error fetching family locations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // Odśwież co minutę
    const interval = setInterval(fetchLocations, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rodzinne Śledzenie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rodzinne Śledzenie
          </CardTitle>
          <CardDescription>Lokalizacje członków rodziny</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-sm">
              Nikt nie udostępnia lokalizacji
            </p>
            <Link href="/settings/family">
              <Button variant="link" size="sm" className="mt-2">
                Włącz udostępnianie
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Rodzinne Śledzenie
        </CardTitle>
        <CardDescription>Gdzie są członkowie rodziny?</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                style={{ backgroundColor: member.color }}
              >
                {(member.name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{member.name || "Nieznany"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(member.lastUpdate), {
                    addSuffix: true,
                    locale: pl,
                  })}
                </p>
              </div>
              <div className="shrink-0">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
        <Link href="/family">
          <Button variant="outline" size="sm" className="w-full mt-4">
            Zobacz mapę
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

